import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin, clearSessionCookie } from "@/lib/admin/authz";
import { endAllSessions } from "@/lib/admin/session";
import { internalError } from "@/lib/http/api";

/** "Sign out everywhere": revokes every active session of the signed-in account, this one included. */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, null);
  if (!auth.ok) return auth.response;
  try {
    const revoked = await endAllSessions(auth.admin.userId);
    await recordAudit(
      { userId: auth.admin.userId, role: auth.admin.role },
      { action: "auth.logout_all", entity: "admin_session", entityId: auth.admin.userId, diff: { revoked }, request },
    );
    return clearSessionCookie(NextResponse.json({ ok: true, revoked }));
  } catch (error) {
    return internalError("admin/logout-all", error, "Sessions could not be revoked.");
  }
}
