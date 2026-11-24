import { NextResponse } from "next/server";
import { authorizeAdmin, pageParams } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { getAdminPayments } from "@/lib/admin/operations";

/** GET /api/admin/payments?page=&pageSize= → payment totals + one page of masked records. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "payments.view");
  if (!auth.ok) return auth.response;
  const { page, pageSize } = pageParams(new URL(request.url), 30);
  try {
    return NextResponse.json(await getAdminPayments(page, pageSize), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("payments", error, "Payment records could not be loaded.");
  }
}
