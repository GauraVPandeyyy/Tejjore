import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { adminSessionSecret, findAdminUser, type AdminIdentity } from "@/lib/admin/auth";
import { auditIpHash } from "@/lib/admin/audit";
import { AdminStoreUnavailable, adminPersistence } from "@/lib/admin/persistence";
import { permissionsForRole, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";

/**
 * Revocable server-side staff sessions.
 *
 * Cookie: `v1.<token>.<hmac>`: a 256-bit random token plus an HMAC (ADMIN_SESSION_SECRET), so a
 * forged or modified cookie is rejected before any lookup and rotating the secret signs everyone
 * out. The server stores only SHA-256(token) in admin_sessions, with the user, role, expiry and
 * revocation time. Role and identity are re-read from configuration on every request: a changed
 * or removed account ends its sessions. Cookie flags: HttpOnly, SameSite=Strict, Secure and a
 * `__Host-` name in production.
 */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const SESSION_IDLE_SECONDS = 2 * 60 * 60;
const TOUCH_INTERVAL_MS = 5 * 60_000;
const COOKIE_PATTERN = /^v1\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/;

export type AdminContext = {
  userId: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  /** SHA-256 of the session token: identifies the session server-side; never sent to the browser. */
  sessionKey: string;
  expiresAt: string;
};

export type SessionFailure = "missing" | "invalid" | "expired" | "revoked" | "account_changed" | "unavailable";
export type SessionState = { ok: true; admin: AdminContext } | { ok: false; reason: SessionFailure };

const production = () => process.env.NODE_ENV === "production";

export function sessionCookieName() {
  return production() ? "__Host-tejjora_admin" : "tejjora_admin_session";
}

export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: production(), sameSite: "strict" as const, path: "/", maxAge };
}

const sign = (token: string) => createHmac("sha256", adminSessionSecret()).update(`v1.${token}`).digest("base64url");
export const sessionKeyFor = (token: string) => createHash("sha256").update(token).digest("hex");

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

/** Returns the token when the cookie is well-formed and correctly signed, else null. */
export function decodeSessionCookie(value: string | undefined | null): string | null {
  if (!value || !adminSessionSecret()) return null;
  const match = value.match(COOKIE_PATTERN);
  if (!match) return null;
  return safeEqual(sign(match[1]), match[2]) ? match[1] : null;
}

/** Reads the session cookie from a raw Cookie header (route handlers). */
export function readSessionCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const name = sessionCookieName();
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

/**
 * Creates a brand-new session (fresh random token every time, which prevents session fixation:
 * any session presented at sign-in is revoked by the caller) and returns the cookie value.
 */
export async function startSession(identity: AdminIdentity, request?: Request) {
  if (!adminSessionSecret()) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await adminPersistence().createSession({
    id: sessionKeyFor(token),
    userId: identity.id,
    role: identity.role,
    createdAt: now.toISOString(),
    expiresAt,
    lastSeenAt: now.toISOString(),
    revokedAt: null,
    ipHash: auditIpHash(request),
  });
  return { cookieValue: `v1.${token}.${sign(token)}`, expiresAt };
}

/** Resolves a cookie value to the current staff identity, enforcing revocation and expiry. */
export async function resolveSession(cookieValue: string | undefined | null, now = new Date()): Promise<SessionState> {
  if (!cookieValue) return { ok: false, reason: "missing" };
  const token = decodeSessionCookie(cookieValue);
  if (!token) return { ok: false, reason: "invalid" };
  const key = sessionKeyFor(token);
  try {
    const store = adminPersistence();
    const record = await store.findSession(key);
    if (!record) return { ok: false, reason: "invalid" };
    if (record.revokedAt) return { ok: false, reason: "revoked" };
    const nowMs = now.getTime();
    const lastActive = Date.parse(record.lastSeenAt ?? record.createdAt);
    if (Date.parse(record.expiresAt) <= nowMs || lastActive + SESSION_IDLE_SECONDS * 1000 <= nowMs) {
      await store.revokeSession(key, now.toISOString());
      return { ok: false, reason: "expired" };
    }
    // Identity and role always come from the current configuration, never from the cookie.
    const user = findAdminUser(record.userId);
    if (!user || user.role !== record.role) {
      await store.revokeSession(key, now.toISOString());
      return { ok: false, reason: "account_changed" };
    }
    if (nowMs - lastActive > TOUCH_INTERVAL_MS) await store.touchSession(key, now.toISOString());
    return {
      ok: true,
      admin: { userId: user.id, name: user.name, role: user.role, permissions: permissionsForRole(user.role), sessionKey: key, expiresAt: record.expiresAt },
    };
  } catch (error) {
    if (!(error instanceof AdminStoreUnavailable)) {
      console.error("[admin] session store error", error instanceof Error ? error.message : error);
    }
    return { ok: false, reason: "unavailable" };
  }
}

/** Revokes the session behind a cookie value (no-op for missing or forged cookies). */
export async function endSession(cookieValue: string | undefined | null) {
  const token = decodeSessionCookie(cookieValue);
  if (!token) return false;
  return adminPersistence().revokeSession(sessionKeyFor(token), new Date().toISOString());
}

/** Revokes every active session of one account ("log out everywhere"). */
export async function endAllSessions(userId: string) {
  return adminPersistence().revokeUserSessions(userId, new Date().toISOString());
}
