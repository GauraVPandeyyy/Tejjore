import { NextResponse } from "next/server";
import { findAdminUser } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { adminPersistence } from "@/lib/admin/persistence";
import { endAllSessions } from "@/lib/admin/session";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";

/**
 * Owner (staff.manage):
 *   POST { userId }          → sign that account out everywhere (revoke every active session);
 *   POST { userId, handle }  → revoke one session, identified by the handle from GET /api/admin/staff.
 */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, "staff.manage");
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const body = await readJsonBody<{ userId?: unknown; handle?: unknown }>(request);
  const user = typeof body?.userId === "string" ? findAdminUser(body.userId) : null;
  if (!user) return apiError("NOT_FOUND", "Staff account not found.", 404);
  try {
    if (body?.handle !== undefined) {
      const handle = typeof body.handle === "string" && /^[0-9a-f]{16}$/.test(body.handle) ? body.handle : null;
      const now = new Date().toISOString();
      const session = handle
        ? (await adminPersistence().listActiveSessions(now)).find((item) => item.userId.toLowerCase() === user.id.toLowerCase() && item.id.startsWith(handle))
        : undefined;
      if (!session || !(await adminPersistence().revokeSession(session.id, now))) return apiError("NOT_FOUND", "That session is no longer active.", 404);
      await recordAudit(auth.admin, { action: "admin_user.session_revoked", entity: "admin_user", entityId: user.id, diff: { handle }, request });
      return NextResponse.json({ ok: true, revoked: 1 });
    }
    const revoked = await endAllSessions(user.id);
    await recordAudit(auth.admin, { action: "admin_user.sessions_revoked", entity: "admin_user", entityId: user.id, diff: { revoked }, request });
    return NextResponse.json({ ok: true, revoked });
  } catch (error) {
    return adminErrorResponse("staff/sessions", error, "Sessions could not be revoked.");
  }
}
