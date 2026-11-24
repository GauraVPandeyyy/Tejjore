import { NextResponse } from "next/server";
import { adminAuthConfigured, authenticateAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { endSession, readSessionCookie, sessionCookieName, sessionCookieOptions, SESSION_TTL_SECONDS, startSession } from "@/lib/admin/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

const WINDOW_MS = 15 * 60_000;
const TOO_MANY = "Too many sign-in attempts. Try again later.";

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  if (!adminAuthConfigured()) return apiError("ADMIN_NOT_CONFIGURED", "Admin access is not configured.", 503);

  const ipLimited = await enforceRateLimit(request, "admin-login-ip", { limit: 10, windowMs: WINDOW_MS }, TOO_MANY);
  if (ipLimited) return ipLimited;

  const body = await readJsonBody<{ userId?: string; password?: string }>(request);
  if (typeof body?.userId !== "string" || typeof body.password !== "string" || !body.userId || !body.password) {
    return apiError("CREDENTIALS_REQUIRED", "User ID and password are required.", 400);
  }

  // Per-account limit is keyed by a hash of whatever id was typed, so it behaves identically
  // for existing and non-existing accounts and does not reveal which ids are valid.
  const accountLimited = await enforceRateLimit(request, "admin-login-account", { limit: 10, windowMs: WINDOW_MS }, TOO_MANY, body.userId.trim().toLowerCase());
  if (accountLimited) return accountLimited;

  const identity = authenticateAdmin(body.userId, body.password);
  if (!identity) {
    // The typed id is not recorded (it may be a mistyped password).
    await recordAudit("anonymous", { action: "auth.login_failed", entity: "admin_session", request });
    return apiError("INVALID_CREDENTIALS", "Invalid credentials.", 401);
  }

  try {
    // Never adopt a session presented at sign-in (fixation): revoke it and issue a fresh one.
    await endSession(readSessionCookie(request.headers.get("cookie"))).catch(() => false);
    const session = await startSession(identity, request);
    await recordAudit({ userId: identity.id, role: identity.role }, { action: "auth.login", entity: "admin_session", entityId: identity.id, request });
    const response = NextResponse.json({ ok: true, user: { id: identity.id, name: identity.name, role: identity.role } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookieName(), session.cookieValue, sessionCookieOptions(SESSION_TTL_SECONDS));
    return response;
  } catch (error) {
    return internalError("admin/login", error, "Sign-in is temporarily unavailable.");
  }
}
