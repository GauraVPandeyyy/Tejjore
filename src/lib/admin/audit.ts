import "server-only";
import { createHmac } from "node:crypto";
import { adminSessionSecret } from "@/lib/admin/auth";
import { adminPersistence, type AuditEntry, type AuditEntryDetail, type AuditFilter, type AuditInsert } from "@/lib/admin/persistence";
import type { AdminRole } from "@/lib/admin/permissions";
import { clientAddress } from "@/lib/security/rateLimit";

/**
 * The single way to write the audit trail (audit_log, db/migrations/005).
 *
 * Never recorded: passwords, password hashes, session tokens, access tokens, payment secrets,
 * credentials, or guest contact details. Diffs pass through `sanitizeAuditDiff`, which redacts
 * by key name and bounds size; IP addresses are stored only as a keyed hash.
 */
export type AuditActor = { userId: string; role: AdminRole } | "anonymous" | "system";

export type AuditEvent = {
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  request?: Request;
};

const ACTION_PATTERN = /^[a-z][a-z0-9_.:-]{1,79}$/;
const ENTITY_PATTERN = /^[a-z][a-z0-9_]{1,59}$/;
const SENSITIVE_KEY = /pass(word)?|hash|token|secret|session|cookie|authori[sz]ation|signature|api[-_]?key|credential|private|email|phone|mobile|otp|card|cvv|gst/i;
const REDACTED = "[redacted]";

/** Redacts sensitive keys (at any depth) and bounds strings, arrays and depth. */
export function sanitizeAuditDiff(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  if (depth >= 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeAuditDiff(item, depth + 1));
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      result[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitizeAuditDiff(item, depth + 1);
    }
    return result;
  }
  return undefined;
}

/** Keyed (HMAC) hash of the trusted client IP, so raw addresses are never stored. */
export function auditIpHash(request?: Request) {
  const secret = adminSessionSecret();
  const address = request ? clientAddress(request) : "unknown";
  if (!secret || address === "unknown") return null;
  return createHmac("sha256", secret).update(`audit-ip:${address}`).digest("hex");
}

/**
 * Records one audit event. It never throws: an audit failure is logged server-side and must not
 * turn an already-committed operational change into an error for staff.
 */
export async function recordAudit(actor: AuditActor, event: AuditEvent): Promise<void> {
  if (!ACTION_PATTERN.test(event.action) || !ENTITY_PATTERN.test(event.entity)) {
    console.error(`[audit] rejected malformed event ${JSON.stringify({ action: event.action, entity: event.entity })}`);
    return;
  }
  const entry: AuditInsert = {
    at: new Date().toISOString(),
    actor: typeof actor === "string" ? actor : actor.userId,
    role: typeof actor === "string" ? (actor === "system" ? "system" : null) : actor.role,
    action: event.action,
    entity: event.entity,
    entityId: event.entityId ? String(event.entityId).slice(0, 200) : null,
    diff: event.diff ? (sanitizeAuditDiff(event.diff) as Record<string, unknown>) : null,
    ipHash: auditIpHash(event.request),
  };
  try {
    await adminPersistence().insertAudit(entry);
  } catch (error) {
    console.error(`[audit] could not record ${event.action} on ${event.entity}`, error instanceof Error ? error.message : error);
  }
}

export async function listAuditEntries(filter: AuditFilter, page: number, pageSize: number): Promise<{ items: AuditEntry[]; total: number }> {
  return adminPersistence().listAudit(filter, pageSize, (page - 1) * pageSize);
}

export async function getAuditEntry(id: number): Promise<AuditEntryDetail | null> {
  return adminPersistence().getAudit(id);
}
