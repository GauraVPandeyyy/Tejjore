import { NextResponse } from "next/server";
import { getAuditEntry } from "@/lib/admin/audit";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { apiError } from "@/lib/http/api";

/** One audit entry with its (already sanitised) diff. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(request, "audit.view");
  if (!auth.ok) return auth.response;
  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isSafeInteger(id) || id < 1) return apiError("INVALID_REQUEST", "Invalid audit entry.", 400);
  try {
    const entry = await getAuditEntry(id);
    if (!entry) return apiError("NOT_FOUND", "Audit entry not found.", 404);
    return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("audit/detail", error, "The audit entry could not be loaded.");
  }
}
