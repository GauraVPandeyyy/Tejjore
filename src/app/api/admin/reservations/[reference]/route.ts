import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { getAdminReservationDetail, patchAdminReservation, toAdminReservationDetail } from "@/lib/admin/operations";
import { deliverReservationConfirmation } from "@/lib/email/confirmation";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";
import type { AdminReservationPatch } from "@/types/admin";

/** Full guest details: a deliberate action, recorded in the audit trail (without the details). */
export async function GET(request: Request, context: { params: Promise<{ reference: string }> }) {
  const auth = await authorizeAdmin(request, "reservations.view");
  if (!auth.ok) return auth.response;
  const { reference } = await context.params;
  try {
    const detail = await getAdminReservationDetail(reference);
    if (!detail) return apiError("NOT_FOUND", "Reservation not found.", 404);
    await recordAudit(auth.admin, { action: "reservation.detail_viewed", entity: "reservation", entityId: detail.reference, request });
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("reservations/detail", error, "Reservation could not be loaded.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ reference: string }> }) {
  const auth = await authorizeAdmin(request, "reservations.manage");
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const { reference } = await context.params;
  const body = await readJsonBody<AdminReservationPatch>(request);
  if (!body) return apiError("INVALID_REQUEST", "Update details are required.", 400);
  try {
    const { reservation: updated, previous } = await patchAdminReservation(reference, body);
    // Notes are internal and may mention the guest, so only the fact of a change is audited.
    const notesChanged = typeof body.staffNotes === "string" && body.staffNotes.slice(0, 2000) !== previous.staffNotes;
    if (previous.status !== updated.status || notesChanged) {
      await recordAudit(auth.admin, {
        action: "reservation.updated",
        entity: "reservation",
        entityId: updated.reference,
        diff: { status: { from: previous.status, to: updated.status }, staffNotesChanged: notesChanged },
        request,
      });
    }
    if (body.status === "confirmed") {
      // Staff confirming a paid reservation (e.g. after payment review) owes the guest the
      // same confirmation email an automatic confirmation sends. Not sent for unpaid manual confirms.
      // The status change is already saved; an email problem must not report the update as failed.
      const email = await deliverReservationConfirmation(updated.reference).catch((error: unknown) => {
        console.error("Confirmation email after staff confirmation failed", error instanceof Error ? error.message : error);
        return { status: "failed" as const };
      });
      return NextResponse.json({
        ...toAdminReservationDetail(updated),
        confirmationEmailStatus: email.status === "not_applicable" ? updated.confirmationEmailStatus : email.status,
      });
    }
    return NextResponse.json(toAdminReservationDetail(updated));
  } catch (error) {
    return adminErrorResponse("reservations/patch", error, "Reservation could not be updated.");
  }
}
