import { NextResponse } from "next/server";
import { listAuditEntries } from "@/lib/admin/audit";
import { authorizeAdmin, pageParams } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";

const FILTER = /^[a-z][a-z0-9_.:-]{0,79}$/;
const filterValue = (value: string | null) => (value && FILTER.test(value) ? value : undefined);

/** GET /api/admin/audit?page=&pageSize=&action=&entity=&actor= → newest first, without diffs. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "audit.view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const { page, pageSize } = pageParams(url, 50);
  const actor = url.searchParams.get("actor")?.trim().slice(0, 120) || undefined;
  try {
    const result = await listAuditEntries(
      { action: filterValue(url.searchParams.get("action")), entity: filterValue(url.searchParams.get("entity")), actor },
      page,
      pageSize,
    );
    return NextResponse.json({ ...result, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("audit/list", error, "The audit log could not be loaded.");
  }
}
