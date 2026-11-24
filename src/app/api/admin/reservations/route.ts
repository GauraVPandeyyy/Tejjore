import { NextResponse } from "next/server";
import { authorizeAdmin, pageParams } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { listAdminReservations } from "@/lib/admin/operations";
import type { ReservationStatus } from "@/types/booking";

const STATUSES: ReservationStatus[] = ["initiated", "payment_pending", "payment_review", "confirmed", "payment_failed", "cancelled", "completed"];

/**
 * GET /api/admin/reservations?page=&pageSize=&status=&q=
 * One page of masked summaries. `q` matches reference, name, email or phone server-side.
 */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "reservations.view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const { page, pageSize } = pageParams(url);
  const status = url.searchParams.get("status");
  try {
    const result = await listAdminReservations({
      page,
      pageSize,
      status: status && (STATUSES as string[]).includes(status) ? status : null,
      query: (url.searchParams.get("q") ?? "").slice(0, 120),
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("reservations/list", error, "Reservations could not be loaded.");
  }
}
