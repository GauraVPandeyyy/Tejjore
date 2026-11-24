import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin, clearSessionCookie } from "@/lib/admin/authz";
import { endSession, readSessionCookie } from "@/lib/admin/session";
import { internalError } from "@/lib/http/api";

/** Signs out this browser: the session is revoked server-side, then the cookie is cleared. */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, null);
  if (!auth.ok) return auth.response;
  try {
    await endSession(readSessionCookie(request.headers.get("cookie")));
    await recordAudit({ userId: auth.admin.userId, role: auth.admin.role }, { action: "auth.logout", entity: "admin_session", entityId: auth.admin.userId, request });
    return clearSessionCookie(NextResponse.json({ ok: true }));
  } catch (error) {
    return internalError("admin/logout", error, "Sign-out could not be completed.");
  }
}
