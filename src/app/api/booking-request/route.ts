import { NextResponse } from "next/server";
import { BookingInputError, createReservation } from "@/lib/booking/reservations";
import { validateBookingPayload } from "@/lib/booking/validation";
import { sendBookingReceivedEmail } from "@/lib/email/provider";
import { paymentMode } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Backward-compatible alias retained for older links/clients from Stage 8.
 * New code should use POST /api/reservations.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "booking-request-alias", { limit: 5, windowMs: 15 * 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many reservation attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const raw = await request.json().catch(() => null);
  const validation = validateBookingPayload(raw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.payload;

  try {
    const { reservation, accessToken } = await createReservation(body);
    const mode = paymentMode();
    const bookingEmail = await sendBookingReceivedEmail(reservation);

    if (bookingEmail.status === "failed") {
      console.warn("Booking received email delivery failed", {
        reference: reservation.reference,
        error: bookingEmail.error,
      });
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
    if (error instanceof BookingInputError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Reservation could not be created", error);
    return NextResponse.json(
      { error: "Reservation could not be created right now. Please try again shortly." },
      { status: 503 },
    );
  }
}
