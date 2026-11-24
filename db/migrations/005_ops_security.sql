-- Phase 2: operations / security schema used by Phase 3 (admin audit + revocable sessions) and
-- Phase 7 (Gemini free-tier budget). rate_limits and schema_migrations already exist (002).
-- Additive only. Applied by scripts/db-migrate.mjs in one transaction with its ledger row.
--
-- Deferred on purpose: the reservations status CHECK listed in masterplan §7 lands with the
-- Phase 6 status work, because the booking store rewrites rows and a premature constraint
-- could block booking writes on legacy rows.

-- Append-only audit trail. ip_hash is a SHA-256 hex digest, never a raw address.
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL CHECK (length(btrim(actor)) BETWEEN 1 AND 120),
  role TEXT CHECK (role IS NULL OR role IN ('owner', 'manager', 'front_desk', 'kitchen', 'system', 'guest')),
  action TEXT NOT NULL CHECK (action ~ '^[a-z][a-z0-9_.:-]{1,79}$'),
  entity TEXT NOT NULL CHECK (entity ~ '^[a-z][a-z0-9_]{1,59}$'),
  entity_id TEXT CHECK (entity_id IS NULL OR length(entity_id) <= 200),
  diff JSONB,
  ip_hash TEXT CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity, entity_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor, at DESC);

CREATE OR REPLACE FUNCTION tejjora_audit_log_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE OR REPLACE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION tejjora_audit_log_append_only();

-- Revocable staff sessions. id is a random session identifier (or its hash), never a password.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 16 AND 128),
  user_id TEXT NOT NULL CHECK (length(btrim(user_id)) BETWEEN 1 AND 120),
  role TEXT CHECK (role IS NULL OR role IN ('owner', 'manager', 'front_desk', 'kitchen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_hash TEXT CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT admin_sessions_expiry_chk CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_active_idx ON admin_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at);

-- Daily AI usage per provider, for the Gemini free-tier budget.
CREATE TABLE IF NOT EXISTS ai_usage (
  day DATE NOT NULL,
  provider TEXT NOT NULL CHECK (provider ~ '^[a-z][a-z0-9-]{0,39}$'),
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, provider)
);

CREATE OR REPLACE TRIGGER ai_usage_touch BEFORE UPDATE ON ai_usage FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
