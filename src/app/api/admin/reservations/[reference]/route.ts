import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { patchAdminReservation } from "@/lib/admin/operations";
import { deliverReservationConfirmation } from "@/lib/email/confirmation";
import type { AdminReservationPatch } from "@/types/admin";

export async function PATCH(request: Request, context: { params: Promise<{ reference: string }> }) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { reference } = await context.params;
  const body = await request.json().catch(() => null) as AdminReservationPatch | null;
  if (!body) return NextResponse.json({ error: "Update details are required." }, { status: 400 });
  try {
    const updated = await patchAdminReservation(reference, body);
    if (body.status === "confirmed") {
      // Staff confirming a paid reservation (e.g. after payment review) owes the guest the
      // same confirmation email an automatic confirmation sends. Not sent for unpaid manual confirms.
      // The status change is already saved; an email problem must not report the update as failed.
      const email = await deliverReservationConfirmation(updated.reference).catch((error: unknown) => {
        console.error("Confirmation email after staff confirmation failed", error);
        return { status: "failed" as const };
      });
      return NextResponse.json({ ...updated, confirmationEmailStatus: email.status === "not_applicable" ? updated.confirmationEmailStatus : email.status });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reservation could not be updated." }, { status: 400 });
  }
}
