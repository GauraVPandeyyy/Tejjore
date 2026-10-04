import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { applyVerifiedPaymentToStore } from "@/lib/booking/reservations";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { withBookingStore } from "@/lib/booking/store";
import { deliverReservationConfirmation } from "@/lib/email/confirmation";

const paymentEvents = new Set(["payment.captured", "order.paid", "payment.failed"]);

type RazorpayNotes = { booking_reference?: string };
type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; notes?: RazorpayNotes } };
    order?: { entity?: { id?: string; amount_paid?: number; notes?: RazorpayNotes } };
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const suppliedEventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(raw) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const event = String(payload?.event ?? "");
  if (!paymentEvents.has(event)) return NextResponse.json({ ok: true, ignored: true });

  const payment = payload?.payload?.payment?.entity;
  const order = payload?.payload?.order?.entity;
  const reference = String(payment?.notes?.booking_reference || order?.notes?.booking_reference || "").trim().toUpperCase();
  const orderId = String(payment?.order_id || order?.id || "");
  const rawReceived = payment?.amount ?? order?.amount_paid;
  const receivedPaise = typeof rawReceived === "number" && Number.isFinite(rawReceived) ? rawReceived : undefined;
  const eventId = suppliedEventId || createHash("sha256").update(raw).digest("hex");
  const looksLikeTejjoraBooking = /^TLV-\d{6}-[A-Z0-9]{6}$/.test(reference);

  if (!looksLikeTejjoraBooking && !orderId) return NextResponse.json({ ok: true, ignored: true });

  const result = await withBookingStore((store) => {
    if (store.processedWebhookIds.includes(eventId)) return { duplicate: true, matched: true, retry: false, review: false, reference: "", confirmed: false };

    const byOrder = orderId ? store.reservations.find((item) => item.paymentOrderId === orderId) : undefined;
    const byReference = looksLikeTejjoraBooking ? store.reservations.find((item) => item.reference === reference) : undefined;
    const reservation = byOrder ?? byReference;
    if (!reservation) return { duplicate: false, matched: false, retry: looksLikeTejjoraBooking, review: false, reference: "", confirmed: false };

    const orderMatches = Boolean(orderId && reservation.paymentOrderId === orderId);
    let review = false;

    if (event === "payment.captured" || event === "order.paid") {
      if (orderMatches) {
        applyVerifiedPaymentToStore(store, reservation, payment?.id ?? reservation.paymentId ?? "", receivedPaise);
        review = reservation.status === "payment_review";
      } else {
        // A valid, signed payment tied to the booking reference but to an older/different
        // order must never disappear. Record the money and require staff review instead of
        // auto-confirming inventory against a mismatched order.
        reservation.paymentId = payment?.id ?? reservation.paymentId;
        reservation.paymentStatus = "paid";
        reservation.status = "payment_review";
        reservation.expiresAt = null;
        reservation.pricing.amountPaid = receivedPaise != null ? receivedPaise / 100 : reservation.pricing.grandTotal;
        reservation.pricing.amountDue = Math.max(0, reservation.pricing.grandTotal - reservation.pricing.amountPaid);
        reservation.updatedAt = new Date().toISOString();
        review = true;
      }
    } else if (event === "payment.failed" && orderMatches && reservation.paymentStatus !== "paid") {
      // Razorpay lets the guest retry within the same checkout/order, so a failed attempt
      // must not release the room hold. The hold simply runs to its normal expiry.
      reservation.paymentStatus = "failed";
      reservation.updatedAt = new Date().toISOString();
    }

    store.processedWebhookIds.push(eventId);
    if (store.processedWebhookIds.length > 2000) store.processedWebhookIds.splice(0, store.processedWebhookIds.length - 2000);
    return { duplicate: false, matched: true, retry: false, review, reference: reservation.reference, confirmed: reservation.status === "confirmed" && reservation.paymentStatus === "paid" };
  });

  // A signed event explicitly naming a Tejjora booking that is not in the local store is
  // retriable rather than being permanently marked processed. This protects the tiny race
  // between gateway order creation and local order-id persistence.
  if (result.retry) {
    return NextResponse.json({ error: "Reservation is not available for webhook reconciliation yet." }, { status: 503 });
  }

  const email = result.confirmed && result.reference ? await deliverReservationConfirmation(result.reference) : { status: "not_applicable" as const };
  return NextResponse.json({ ok: true, duplicate: result.duplicate, matched: result.matched, review: result.review, confirmationEmailStatus: email.status });
}
