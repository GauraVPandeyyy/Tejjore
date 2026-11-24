-- Phase 1 (security/correctness hotfixes). Additive and safe to apply before or after deploying
-- the Phase 1 code: older code never writes the new column (it defaults to '[]') and never reads
-- the new tables. Apply BEFORE deploying Phase 1 code, which refuses booking writes without it.
--
-- Numbering note: the redesign masterplan originally reserved 002+ for the Phase 2 content schema.
-- Phase 2 migrations now start at 003.
BEGIN;

-- Append-only record of every gateway payment applied to a reservation, so a second or
-- duplicate payment event can never overwrite an earlier one. Shape (see ReservationRecord.payments):
-- [{ "paymentId", "amountPaise", "amountSource", "orderId", "orderMatched", "source", "recordedAt" }]
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Shared fixed-window rate limiting across all app instances. bucket_key is
-- "<scope>:<sha256(client ip or account)>", never a raw IP address or user id.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL CHECK (hits >= 0),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
