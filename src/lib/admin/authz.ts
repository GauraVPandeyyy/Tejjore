import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { roleHasPermission, type AdminPermission } from "@/lib/admin/permissions";
import { readSessionCookie, resolveSession, sessionCookieName, sessionCookieOptions, type AdminContext, type SessionFailure } from "@/lib/admin/session";
import { apiError } from "@/lib/http/api";
import { isSameOriginRequest } from "@/lib/security/origin";

export type { AdminContext };

/**
 * Central admin authorization. Every /api/admin route calls `authorizeAdmin` with the minimum
 * permission it needs:
 *
 *   const auth = await authorizeAdmin(request, "reservations.manage");
 *   if (!auth.ok) return auth.response;
 *   auth.admin // typed staff identity
 *
 * Order: same-origin check for state-changing methods (Phase 1 CSRF guard) → session (revocation,
 * expiry, current role) → permission. Errors use the Phase 1 `{ error: { code, message } }` contract.
 */
export type AdminAuthResult = { ok: true; admin: AdminContext } | { ok: false; response: NextResponse };

const ENDED: SessionFailure[] = ["expired", "revoked", "account_changed"];

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName(), "", sessionCookieOptions(0));
  return response;
}

function sessionFailureResponse(reason: SessionFailure) {
  if (reason === "unavailable") return apiError("ADMIN_UNAVAILABLE", "Staff access is temporarily unavailable.", 503);
  if (ENDED.includes(reason)) return clearSessionCookie(apiError("SESSION_ENDED", "Your session has ended. Please sign in again.", 401));
  return apiError("UNAUTHORIZED", "Unauthorized.", 401);
}

export const hasPermission = (admin: Pick<AdminContext, "role">, permission: AdminPermission) => roleHasPermission(admin.role, permission);

/** `permission: null` = any signed-in staff member (sign-out actions only). */
export async function authorizeAdmin(request: Request, permission: AdminPermission | null): Promise<AdminAuthResult> {
  if (!["GET", "HEAD"].includes(request.method) && !isSameOriginRequest(request)) {
    return { ok: false, response: apiError("CROSS_ORIGIN_FORBIDDEN", "This request is not allowed from another site.", 403) };
  }
  const state = await resolveSession(readSessionCookie(request.headers.get("cookie")));
  if (!state.ok) return { ok: false, response: sessionFailureResponse(state.reason) };
  if (permission && !hasPermission(state.admin, permission)) {
    return { ok: false, response: apiError("FORBIDDEN", "Your role does not allow this action.", 403) };
  }
  return { ok: true, admin: state.admin };
}

/** Server components: the signed-in staff member, or a redirect to sign-in. */
export async function requireAdminPage(): Promise<AdminContext> {
  const state = await resolveSession((await cookies()).get(sessionCookieName())?.value);
  if (state.ok) return state.admin;
  if (state.reason === "unavailable") redirect("/admin/login?reason=unavailable");
  redirect(ENDED.includes(state.reason) ? "/admin/login?reason=ended" : "/admin/login");
}

/** Login page: is there already a valid session? */
export async function currentAdminSession() {
  const state = await resolveSession((await cookies()).get(sessionCookieName())?.value);
  return state.ok ? state.admin : null;
}

/** Bounded pagination parameters from a URL (page ≥ 1, 1 ≤ pageSize ≤ 100). */
export function pageParams(url: URL, defaultSize = 25) {
  const page = Math.max(1, Math.min(10_000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("pageSize") ?? String(defaultSize), 10) || defaultSize));
  return { page, pageSize };
}
