import { NextResponse } from "next/server";
import { createReservation } from "@/lib/booking/reservations";
import { parseBookingPayload } from "@/lib/booking/validation";
import { sendBookingReceivedEmail } from "@/lib/email/provider";
import { paymentMode } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "reservation-create", { limit: 5, windowMs: 15 * 60_000 });
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

    // Important: await the transactional email. Fire-and-forget calls are unreliable
    // on serverless hosts because execution may stop immediately after the response.
    // Email failure must NOT delete or invalidate the reservation.
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
    const message = error instanceof Error ? error.message : "Reservation could not be created.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
