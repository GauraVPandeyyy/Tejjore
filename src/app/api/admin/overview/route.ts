import { NextResponse } from "next/server";
import { authorizeAdmin, hasPermission } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { getAdminOverview } from "@/lib/admin/operations";

/** Today view: counts for dashboard.view; arrival/departure names only with reservations.view. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "dashboard.view");
  if (!auth.ok) return auth.response;
  try {
    const overview = await getAdminOverview({ includeLists: hasPermission(auth.admin, "reservations.view") });
    return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("overview", error, "Operations data could not be loaded.");
  }
}
