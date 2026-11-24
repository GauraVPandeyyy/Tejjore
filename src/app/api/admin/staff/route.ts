import { NextResponse } from "next/server";
import { listAdminUsers } from "@/lib/admin/auth";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { adminPersistence } from "@/lib/admin/persistence";

/** Short, non-secret handle for one session: a prefix of SHA-256(token), never the token or full key. */
const sessionHandle = (sessionKey: string) => sessionKey.slice(0, 16);

/**
 * GET /api/admin/staff → configured accounts (id, name, role) with their active sessions
 * (handle, started, last seen, expires; the caller's own session is flagged). Read-only:
 * accounts are managed in ADMIN_USERS_JSON. No hashes, session ids or IP data.
 */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "staff.view");
  if (!auth.ok) return auth.response;
  try {
    const sessions = await adminPersistence().listActiveSessions(new Date().toISOString());
    const users = listAdminUsers().map((user) => {
      const own = sessions.filter((session) => session.userId.toLowerCase() === user.id.toLowerCase());
      const lastSeenAt = own.map((session) => session.lastSeenAt ?? session.createdAt).sort().at(-1) ?? null;
      return {
        ...user,
        activeSessions: own.length,
        lastSeenAt,
        sessions: own.map((session) => ({
          handle: sessionHandle(session.id),
          createdAt: session.createdAt,
          lastSeenAt: session.lastSeenAt,
          expiresAt: session.expiresAt,
          current: session.id === auth.admin.sessionKey,
        })),
      };
    });
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("staff/list", error, "Staff accounts could not be loaded.");
  }
}
