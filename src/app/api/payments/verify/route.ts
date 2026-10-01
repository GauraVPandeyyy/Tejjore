import { NextResponse } from "next/server";
import { reservationAccessMatches } from "@/lib/booking/access";
import { getReservation, settleVerifiedPayment } from "@/lib/booking/reservations";
import { paymentMode, verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/security/rateLimit";
import { deliverReservationConfirmation } from "@/lib/email/confirmation";

export async function POST(request: Request) {
  const limited = rateLimit(request, "payment-verify", { limit: 15, windowMs: 15 * 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many payment verification attempts." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const body = await request.json().catch(() => null) as {
    reference?: string;
    accessToken?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    testSuccess?: boolean;
  } | null;
  if (!body?.reference || !body.accessToken) return NextResponse.json({ error: "Verified booking access is required." }, { status: 400 });
  const reference = body.reference.trim().toUpperCase();
  const reservation = await getReservation(reference);
  if (!reservation || !reservationAccessMatches(reservation, body.accessToken)) {
    return NextResponse.json({ error: "Reservation access could not be verified." }, { status: 403 });
  }

  if ((reservation.status === "confirmed" || reservation.status === "payment_review") && reservation.paymentStatus === "paid") {
    return NextResponse.json({ reference: reservation.reference, status: reservation.status, paymentStatus: reservation.paymentStatus, pricing: reservation.pricing }, { headers: { "Cache-Control": "no-store" } });
  }

  const mode = paymentMode();
  let verified = false;
  let paymentId = body.razorpay_payment_id ?? "";
  if (mode === "razorpay" && body.razorpay_order_id && body.razorpay_payment_id && body.razorpay_signature) {
    verified = reservation.paymentOrderId === body.razorpay_order_id
      && verifyRazorpaySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
  }
  if (mode === "test" && body.testSuccess === true && process.env.NODE_ENV !== "production") {
    verified = reservation.paymentOrderId?.startsWith("test_order_") === true;
    paymentId = `test_payment_${reservation.reference}`;
  }
  if (!verified) {
    return NextResponse.json({ error: "Payment verification failed. If money was debited, do not retry immediately; the secure gateway callback may still confirm the payment." }, { status: 400 });
  }

  const updated = await settleVerifiedPayment(reservation.reference, paymentId);
  const email = updated.status === "confirmed" ? await deliverReservationConfirmation(updated.reference) : { status: "not_applicable" as const };
  return NextResponse.json({
    reference: updated.reference,
    status: updated.status,
    paymentStatus: updated.paymentStatus,
    pricing: updated.pricing,
    reviewRequired: updated.status === "payment_review",
    confirmationEmailStatus: email.status,
  }, { headers: { "Cache-Control": "no-store" } });
}
