import { isBookingReference, normalizeBookingReference } from "@/lib/booking/reference";
import { NextResponse } from "next/server";
import { retrieveReservationWithCredentials } from "@/lib/booking/reservations";
import { toPublicReservationView } from "@/lib/booking/public";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "reservation-retrieve", { limit: 8, windowMs: 15 * 60_000 }, "Too many lookup attempts. Please wait a few minutes and try again.");
  if (limited) return limited;

  const body = await readJsonBody<{ reference?: string; email?: string; phone?: string }>(request);
  const reference = normalizeBookingReference(body?.reference);
  const email = body?.email?.trim() ?? "";
  const phone = body?.phone?.trim() ?? "";
  if (!isBookingReference(reference) || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 7) {
    return apiError("INVALID_LOOKUP", "Enter the booking reference, booking email and phone used for the reservation.", 400);
  }

  // Per-reference limit on top of the per-client one, so rotating addresses cannot brute-force
  // the email/phone pair for a single reference.
  const referenceLimited = await enforceRateLimit(request, "reservation-retrieve-ref", { limit: 10, windowMs: 24 * 60 * 60_000 }, "Too many lookup attempts for this reference. Please contact the hotel.", reference);
  if (referenceLimited) return referenceLimited;

  try {
    const result = await retrieveReservationWithCredentials(reference, email, phone);
    if (!result) return apiError("NOT_VERIFIED", "We could not verify a reservation with those details.", 404);
    return NextResponse.json(toPublicReservationView(result.reservation, result.accessToken), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("reservations/retrieve", error, "The reservation could not be retrieved right now.");
  }
}
