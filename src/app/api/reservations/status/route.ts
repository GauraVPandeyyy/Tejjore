import { isBookingReference } from "@/lib/booking/reference";
import { NextResponse } from "next/server";
import { reservationAccessMatches } from "@/lib/booking/access";
import { toPublicReservationView } from "@/lib/booking/public";
import { getReservation } from "@/lib/booking/reservations";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

/**
 * Current state of a reservation for the browser that created or retrieved it. Used to
 * restore the booking flow after a refresh from the server's record, never from stale
 * client state. Requires the reservation's access token, like the payment endpoints.
 */
export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "reservation-status", { limit: 60, windowMs: 15 * 60_000 }, "Too many status checks. Please wait a moment and try again.");
  if (limited) return limited;

  const body = await readJsonBody<{ reference?: string; accessToken?: string }>(request);
  const reference = body?.reference?.trim().toUpperCase() ?? "";
  if (!isBookingReference(reference) || !body?.accessToken) {
    return apiError("ACCESS_REQUIRED", "Verified booking access is required.", 400);
  }

  try {
    const reservation = await getReservation(reference);
    if (!reservation || !reservationAccessMatches(reservation, body.accessToken)) {
      return apiError("ACCESS_DENIED", "Reservation access could not be verified.", 403);
    }
    return NextResponse.json(toPublicReservationView(reservation, body.accessToken), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("reservations/status", error, "The reservation could not be loaded right now.", { reference });
  }
}
