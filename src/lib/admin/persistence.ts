import "server-only";
import { postgresConfigured, queryPostgres } from "@/lib/database/postgres";
import type { AdminRole } from "@/lib/admin/permissions";

/**
 * Storage for staff sessions and the audit trail.
 *   - DATABASE_URL set → PostgreSQL tables admin_sessions / audit_log (db/migrations/005).
 *   - No database, outside production → in-process memory (local development and QA only).
 *   - No database in production → unavailable: staff sign-in fails closed rather than silently
 *     using sessions that cannot be revoked across instances.
 */
export type SessionRecord = {
  /** SHA-256 of the session token; the token itself is never stored. */
  id: string;
  userId: string;
  role: AdminRole;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  ipHash: string | null;
};

/** `id` stays server-side: the staff API exposes only a short handle derived from it. */
export type ActiveSessionSummary = Pick<SessionRecord, "id" | "userId" | "role" | "createdAt" | "expiresAt" | "lastSeenAt">;

export type AuditInsert = {
  at: string;
  actor: string;
  role: AdminRole | "system" | "guest" | null;
  action: string;
  entity: string;
  entityId: string | null;
  diff: Record<string, unknown> | null;
  ipHash: string | null;
};

export type AuditEntry = Omit<AuditInsert, "diff"> & { id: number; hasDiff: boolean };
export type AuditEntryDetail = AuditEntry & { diff: Record<string, unknown> | null };
export type AuditFilter = { action?: string; entity?: string; actor?: string };

export interface AdminPersistence {
  readonly kind: "postgres" | "memory";
  createSession(record: SessionRecord): Promise<void>;
  findSession(id: string): Promise<SessionRecord | null>;
  touchSession(id: string, at: string): Promise<void>;
  revokeSession(id: string, at: string): Promise<boolean>;
  /** Revokes every unrevoked session of a user; returns how many were revoked. */
  revokeUserSessions(userId: string, at: string): Promise<number>;
  listActiveSessions(now: string): Promise<ActiveSessionSummary[]>;
  insertAudit(entry: AuditInsert): Promise<number>;
  listAudit(filter: AuditFilter, limit: number, offset: number): Promise<{ items: AuditEntry[]; total: number }>;
  getAudit(id: number): Promise<AuditEntryDetail | null>;
}

export class AdminStoreUnavailable extends Error {}

type Query = <Row extends Record<string, unknown>>(text: string, params?: unknown[]) => Promise<{ rows: Row[] }>;

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : value === null || value === undefined ? null : new Date(String(value)).toISOString());

type SessionRow = { id: string; user_id: string; role: AdminRole; created_at: unknown; expires_at: unknown; last_seen_at: unknown; revoked_at: unknown; ip_hash: string | null };
type AuditRow = { id: string | number; at: unknown; actor: string; role: AuditInsert["role"]; action: string; entity: string; entity_id: string | null; ip_hash: string | null; has_diff?: boolean; diff?: Record<string, unknown> | null };

const toSession = (row: SessionRow): SessionRecord => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  createdAt: iso(row.created_at)!,
  expiresAt: iso(row.expires_at)!,
  lastSeenAt: iso(row.last_seen_at),
  revokedAt: iso(row.revoked_at),
  ipHash: row.ip_hash,
});

const toAudit = (row: AuditRow): AuditEntry => ({
  id: Number(row.id),
  at: iso(row.at)!,
  actor: row.actor,
  role: row.role,
  action: row.action,
  entity: row.entity,
  entityId: row.entity_id,
  ipHash: row.ip_hash,
  hasDiff: Boolean(row.has_diff ?? row.diff),
});

/** PostgreSQL implementation; `query` is injectable so tests can run it against PGlite. */
export function postgresAdminPersistence(query: Query): AdminPersistence {
  const filterSql = (filter: AuditFilter) => ({
    where: "WHERE ($1::text IS NULL OR action = $1) AND ($2::text IS NULL OR entity = $2) AND ($3::text IS NULL OR actor = $3)",
    params: [filter.action ?? null, filter.entity ?? null, filter.actor ?? null],
  });
  return {
    kind: "postgres",
    async createSession(record) {
      await query(
        "INSERT INTO admin_sessions (id, user_id, role, created_at, expires_at, last_seen_at, ip_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [record.id, record.userId, record.role, record.createdAt, record.expiresAt, record.lastSeenAt, record.ipHash],
      );
    },
    async findSession(id) {
      const result = await query<SessionRow>(
        "SELECT id, user_id, role, created_at, expires_at, last_seen_at, revoked_at, ip_hash FROM admin_sessions WHERE id = $1",
        [id],
      );
      return result.rows[0] ? toSession(result.rows[0]) : null;
    },
    async touchSession(id, at) {
      await query("UPDATE admin_sessions SET last_seen_at = $2 WHERE id = $1 AND revoked_at IS NULL", [id, at]);
    },
    async revokeSession(id, at) {
      const result = await query("UPDATE admin_sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL RETURNING id", [id, at]);
      return result.rows.length > 0;
    },
    async revokeUserSessions(userId, at) {
      const result = await query(
        "UPDATE admin_sessions SET revoked_at = $2 WHERE lower(user_id) = lower($1) AND revoked_at IS NULL AND expires_at > $2 RETURNING id",
        [userId, at],
      );
      return result.rows.length;
    },
    async listActiveSessions(now) {
      const result = await query<SessionRow>(
        `SELECT id, user_id, role, created_at, expires_at, last_seen_at, revoked_at, ip_hash FROM admin_sessions
          WHERE revoked_at IS NULL AND expires_at > $1 ORDER BY last_seen_at DESC NULLS LAST LIMIT 500`,
        [now],
      );
      return result.rows.map(toSession).map(({ id, userId, role, createdAt, expiresAt, lastSeenAt }) => ({ id, userId, role, createdAt, expiresAt, lastSeenAt }));
    },
    async insertAudit(entry) {
      const result = await query<{ id: string | number }>(
        "INSERT INTO audit_log (at, actor, role, action, entity, entity_id, diff, ip_hash) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING id",
        [entry.at, entry.actor, entry.role, entry.action, entry.entity, entry.entityId, entry.diff === null ? null : JSON.stringify(entry.diff), entry.ipHash],
      );
      return Number(result.rows[0]?.id);
    },
    async listAudit(filter, limit, offset) {
      const { where, params } = filterSql(filter);
      const [items, count] = await Promise.all([
        query<AuditRow>(
          `SELECT id, at, actor, role, action, entity, entity_id, ip_hash, (diff IS NOT NULL) AS has_diff
             FROM audit_log ${where} ORDER BY id DESC LIMIT $4 OFFSET $5`,
          [...params, limit, offset],
        ),
        query<{ total: string | number }>(`SELECT count(*) AS total FROM audit_log ${where}`, params),
      ]);
      return { items: items.rows.map(toAudit), total: Number(count.rows[0]?.total ?? 0) };
    },
    async getAudit(id) {
      const result = await query<AuditRow>("SELECT id, at, actor, role, action, entity, entity_id, ip_hash, diff FROM audit_log WHERE id = $1", [id]);
      const row = result.rows[0];
      return row ? { ...toAudit(row), diff: row.diff ?? null } : null;
    },
  };
}

/** In-process store for development and tests (no database). Lost on restart by design. */
export function memoryAdminPersistence(): AdminPersistence {
  const sessions = new Map<string, SessionRecord>();
  const audit: Array<AuditInsert & { id: number }> = [];
  const matches = (entry: AuditInsert, filter: AuditFilter) =>
    (!filter.action || entry.action === filter.action) && (!filter.entity || entry.entity === filter.entity) && (!filter.actor || entry.actor === filter.actor);
  return {
    kind: "memory",
    async createSession(record) {
      if (sessions.has(record.id)) throw new Error("Duplicate session id");
      sessions.set(record.id, { ...record });
    },
    async findSession(id) {
      const record = sessions.get(id);
      return record ? { ...record } : null;
    },
    async touchSession(id, at) {
      const record = sessions.get(id);
      if (record && !record.revokedAt) record.lastSeenAt = at;
    },
    async revokeSession(id, at) {
      const record = sessions.get(id);
      if (!record || record.revokedAt) return false;
      record.revokedAt = at;
      return true;
    },
    async revokeUserSessions(userId, at) {
      let count = 0;
      for (const record of sessions.values()) {
        if (record.userId.toLowerCase() === userId.toLowerCase() && !record.revokedAt && record.expiresAt > at) {
          record.revokedAt = at;
          count += 1;
        }
      }
      return count;
    },
    async listActiveSessions(now) {
      return [...sessions.values()]
        .filter((record) => !record.revokedAt && record.expiresAt > now)
        .map(({ id, userId, role, createdAt, expiresAt, lastSeenAt }) => ({ id, userId, role, createdAt, expiresAt, lastSeenAt }));
    },
    async insertAudit(entry) {
      const id = audit.length + 1;
      audit.push({ ...entry, id });
      return id;
    },
    async listAudit(filter, limit, offset) {
      const filtered = audit.filter((entry) => matches(entry, filter)).reverse();
      return {
        items: filtered.slice(offset, offset + limit).map(({ diff, ...entry }) => ({ ...entry, hasDiff: diff !== null })),
        total: filtered.length,
      };
    },
    async getAudit(id) {
      const entry = audit.find((item) => item.id === id);
      return entry ? { ...entry, hasDiff: entry.diff !== null } : null;
    },
  };
}

const globalForAdmin = globalThis as typeof globalThis & { __tejjoraAdminMemory?: AdminPersistence; __tejjoraAdminOverride?: AdminPersistence | null };

/** The store for this environment. Throws AdminStoreUnavailable in production without a database. */
export function adminPersistence(): AdminPersistence {
  if (globalForAdmin.__tejjoraAdminOverride) return globalForAdmin.__tejjoraAdminOverride;
  if (postgresConfigured()) return postgresAdminPersistence((text, params) => queryPostgres(text, params));
  if (process.env.NODE_ENV === "production") {
    throw new AdminStoreUnavailable("Staff sessions need DATABASE_URL (admin_sessions, db/migrations/005) in production.");
  }
  globalForAdmin.__tejjoraAdminMemory ??= memoryAdminPersistence();
  return globalForAdmin.__tejjoraAdminMemory;
}

/** Tests only: route all admin persistence to the given store (null restores the default). */
export function setAdminPersistenceForTests(store: AdminPersistence | null) {
  globalForAdmin.__tejjoraAdminOverride = store;
}
