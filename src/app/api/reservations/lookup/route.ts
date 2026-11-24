import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { toMaskedReservationView } from "@/lib/booking/maskedView";
import { isBookingReference, normalizeBookingReference } from "@/lib/booking/reference";
import { lookupReservationByMobile } from "@/lib/booking/reservations";
import { normalizePhoneE164 } from "@/lib/phone";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

const NOT_FOUND = "We couldn't find a booking with those details.";

/**
 * Guest status lookup: booking reference + the registered mobile. Read-only (no token is issued),
 * rate limited per client and per reference. Every failure (bad format, unknown reference, wrong
 * mobile) returns the same 404 and message, so the endpoint cannot be used to enumerate bookings.
 */
export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "reservation-lookup", { limit: 5, windowMs: 15 * 60_000 }, "Too many lookup attempts. Please wait a few minutes and try again.");
  if (limited) return limited;

  const body = await readJsonBody<{ reference?: unknown; phone?: unknown }>(request);
  const reference = normalizeBookingReference(body?.reference);
  const mobile = normalizePhoneE164(body?.phone);
  if (isBookingReference(reference)) {
    const referenceLimited = await enforceRateLimit(request, "reservation-lookup-ref", { limit: 10, windowMs: 24 * 60 * 60_000 }, "Too many lookup attempts for this booking. Please contact the hotel.", reference);
    if (referenceLimited) return referenceLimited;
  }

  try {
    const reservation = isBookingReference(reference) && mobile ? await lookupReservationByMobile(reference, mobile) : null;
    if (!reservation) {
      await recordAudit("anonymous", { action: "reservation.lookup_failed", entity: "reservation", request });
      return apiError("NOT_FOUND", NOT_FOUND, 404);
    }
    await recordAudit("anonymous", { action: "reservation.lookup", entity: "reservation", entityId: reservation.reference, request });
    return NextResponse.json(toMaskedReservationView(reservation), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("reservations/lookup", error, "The booking could not be looked up right now.");
  }
}
