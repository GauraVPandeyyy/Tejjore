import { NextResponse } from "next/server";
import { reservationAccessMatches } from "@/lib/booking/access";
import { getReservation, settleVerifiedPayment } from "@/lib/booking/reservations";
import { paymentMode, verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { deliverReservationConfirmation } from "@/lib/email/confirmation";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

type VerifyBody = {
  reference?: string;
  accessToken?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  testSuccess?: boolean;
};

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "payment-verify", { limit: 15, windowMs: 15 * 60_000 }, "Too many payment verification attempts.");
  if (limited) return limited;

  const body = await readJsonBody<VerifyBody>(request);
  if (!body?.reference || !body.accessToken) return apiError("ACCESS_REQUIRED", "Verified booking access is required.", 400);
  const reference = body.reference.trim().toUpperCase();

  try {
    const reservation = await getReservation(reference);
    if (!reservation || !reservationAccessMatches(reservation, body.accessToken)) {
      return apiError("ACCESS_DENIED", "Reservation access could not be verified.", 403);
    }

    const mode = paymentMode();
    let verified = false;
    let paymentId = body.razorpay_payment_id ?? "";
    let orderId = body.razorpay_order_id ?? "";
    let source: "browser-verify" | "test" = "browser-verify";
    if (mode === "razorpay" && body.razorpay_order_id && body.razorpay_payment_id && body.razorpay_signature) {
      // Only the reservation's own current order can be settled from the browser. Payments against
      // any other order are reconciled by the signed webhook, which carries the gateway amount.
      verified = reservation.paymentOrderId === body.razorpay_order_id
        && verifyRazorpaySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
    }
    if (mode === "test" && body.testSuccess === true && process.env.NODE_ENV !== "production") {
      verified = reservation.paymentOrderId?.startsWith("test_order_") === true;
      paymentId = `test_payment_${reservation.reference}`;
      orderId = reservation.paymentOrderId ?? "";
      source = "test";
    }
    if (!verified) {
      return apiError(
        "PAYMENT_NOT_VERIFIED",
        "Payment verification failed. If money was debited, do not retry immediately; the secure gateway callback may still confirm the payment.",
        400,
      );
    }

    // The ledger is re-read and applied inside the store lock, so a concurrent webhook that has
    // already moved this reservation to payment_review is never downgraded here, and repeating
    // the same verification is a no-op.
    const updated = await settleVerifiedPayment(reservation.reference, { paymentId, orderId, source });
    const email = updated.status === "confirmed" ? await deliverReservationConfirmation(updated.reference) : { status: "not_applicable" as const };
    return NextResponse.json({
      reference: updated.reference,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      pricing: updated.pricing,
      reviewRequired: updated.status === "payment_review",
      confirmationEmailStatus: email.status,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("payments/verify", error, "Payment could not be verified right now. Do not pay again; contact the hotel if needed.", { reference });
  }
}
