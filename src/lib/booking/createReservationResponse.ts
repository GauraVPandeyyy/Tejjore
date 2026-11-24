import "server-only";
import { NextResponse } from "next/server";
import { BookingInputError, createReservation } from "@/lib/booking/reservations";
import { roomOccupancy } from "@/lib/booking/occupancy";
import { occupancyError, validateBookingPayload } from "@/lib/booking/validation";
import { sendBookingReceivedEmail } from "@/lib/email/provider";
import { paymentMode } from "@/lib/payments/razorpay";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

/**
 * Shared handler for POST /api/reservations and its legacy alias /api/booking-request.
 * Both count against the same "reservation-create" rate-limit bucket, so the alias can no
 * longer double a client's hold quota.
 */
export async function handleCreateReservation(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "reservation-create", { limit: 5, windowMs: 15 * 60_000 }, "Too many reservation attempts. Please wait a few minutes and try again.");
  if (limited) return limited;

  const validation = validateBookingPayload(await readJsonBody<unknown>(request));
  if (!validation.ok) return apiError("INVALID_BOOKING", validation.error, 400);
  const body = validation.payload;

  const occupancy = occupancyError((await roomOccupancy())[body.roomId], body.stay.adults, body.stay.children, body.stay.rooms);
  if (occupancy) return apiError("OCCUPANCY_EXCEEDED", occupancy, 400);

  try {
    const { reservation, accessToken } = await createReservation(body);
    const mode = paymentMode();

    // Important: await the transactional email. Fire-and-forget calls are unreliable
    // on serverless hosts because execution may stop immediately after the response.
    // Email failure must NOT delete or invalidate the reservation.
    const bookingEmail = await sendBookingReceivedEmail(reservation);
    if (bookingEmail.status === "failed") {
      console.warn("Booking received email delivery failed", { reference: reservation.reference });
    }

    return NextResponse.json({
      reference: reservation.reference,
      createdAt: reservation.createdAt,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      pricing: reservation.pricing,
      paymentAvailable: mode !== "unavailable",
      paymentMode: mode,
      accessToken,
      bookingReceivedEmailStatus: bookingEmail.status,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BookingInputError) return apiError("BOOKING_UNAVAILABLE", error.message, 409);
    return internalError("reservations", error, "Reservation could not be created right now. Please try again shortly.");
  }
}
