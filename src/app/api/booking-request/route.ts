import { NextResponse } from "next/server";
import { createReservation } from "@/lib/booking/reservations";
import { parseBookingPayload } from "@/lib/booking/validation";
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
  const body = parseBookingPayload(raw);
  if (!body) {
    return NextResponse.json(
      { error: "The booking details are incomplete or contain an invalid/unconfigured option." },
      { status: 400 },
    );
  }

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reservation could not be created." },
      { status: 409 },
    );
  }
}
