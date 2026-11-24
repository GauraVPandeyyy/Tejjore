import { isBookingReference } from "@/lib/booking/reference";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { applyVerifiedPaymentToStore } from "@/lib/booking/reservations";
import { verifyWebhookSignature, webhookSecretConfigured } from "@/lib/payments/razorpay";
import { withBookingStore } from "@/lib/booking/store";
import { deliverReservationConfirmation } from "@/lib/email/confirmation";
import { apiError, logServerError } from "@/lib/http/api";

// Server-to-server endpoint: authenticated by the Razorpay HMAC signature and made safe to
// repeat by event-id idempotency plus the payment ledger. It deliberately has no browser
// Origin check and no rate limit, so legitimate gateway retries are never dropped.
const paymentEvents = new Set(["payment.captured", "order.paid", "payment.failed"]);

type RazorpayNotes = { booking_reference?: string };
type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; notes?: RazorpayNotes } };
    order?: { entity?: { id?: string; amount_paid?: number; notes?: RazorpayNotes } };
  };
};

let lastMissingSecretLog = 0;

export async function POST(request: Request) {
  if (!webhookSecretConfigured()) {
    const now = Date.now();
    if (now - lastMissingSecretLog > 60_000) {
      lastMissingSecretLog = now;
      console.error("[payments/webhook] RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook. Razorpay will retry once it is set.");
    }
    // 503 (not 4xx) so Razorpay keeps retrying instead of discarding the event.
    return apiError("WEBHOOK_UNAVAILABLE", "Webhook processing is temporarily unavailable.", 503);
  }

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const suppliedEventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return apiError("INVALID_SIGNATURE", "Invalid webhook signature.", 401);
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(raw) as RazorpayWebhookPayload;
  } catch {
    return apiError("INVALID_PAYLOAD", "Invalid webhook payload.", 400);
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
  const looksLikeTejjoraBooking = isBookingReference(reference);

  if (!looksLikeTejjoraBooking && !orderId) return NextResponse.json({ ok: true, ignored: true });

  try {
    const result = await withBookingStore((store) => {
      if (store.processedWebhookIds.includes(eventId)) return { duplicate: true, matched: true, retry: false, review: false, reference: "", confirmed: false };

      const byOrder = orderId ? store.reservations.find((item) => item.paymentOrderId === orderId) : undefined;
      const byReference = looksLikeTejjoraBooking ? store.reservations.find((item) => item.reference === reference) : undefined;
      const reservation = byOrder ?? byReference;
      if (!reservation) return { duplicate: false, matched: false, retry: looksLikeTejjoraBooking, review: false, reference: "", confirmed: false };

      const orderMatches = Boolean(orderId && reservation.paymentOrderId === orderId);

      if (event === "payment.captured" || event === "order.paid") {
        // Signed money tied to this booking is always recorded. A payment against an older or
        // different order is kept in the ledger and forces staff review instead of confirming.
        applyVerifiedPaymentToStore(store, reservation, {
          paymentId: payment?.id,
          orderId,
          amountPaise: receivedPaise,
          source: "webhook",
        });
      } else if (event === "payment.failed" && orderMatches && reservation.paymentStatus !== "paid") {
        // Razorpay lets the guest retry within the same checkout/order, so a failed attempt
        // must not release the room hold. The hold simply runs to its normal expiry.
        reservation.paymentStatus = "failed";
        reservation.updatedAt = new Date().toISOString();
      }

      store.processedWebhookIds.push(eventId);
      if (store.processedWebhookIds.length > 2000) store.processedWebhookIds.splice(0, store.processedWebhookIds.length - 2000);
      return {
        duplicate: false,
        matched: true,
        retry: false,
        review: reservation.status === "payment_review",
        reference: reservation.reference,
        confirmed: reservation.status === "confirmed" && reservation.paymentStatus === "paid",
      };
    });

    // A signed event explicitly naming a Tejjora booking that is not in the store yet is retriable
    // rather than being marked processed. This covers the race between gateway order creation
    // and local order-id persistence.
    if (result.retry) return apiError("RESERVATION_NOT_READY", "Reservation is not available for webhook reconciliation yet.", 503);

    const email = result.confirmed && result.reference ? await deliverReservationConfirmation(result.reference) : { status: "not_applicable" as const };
    return NextResponse.json({ ok: true, duplicate: result.duplicate, matched: result.matched, review: result.review, confirmationEmailStatus: email.status });
  } catch (error) {
    // 503 so the gateway retries; details stay server-side.
    const ref = logServerError("payments/webhook", error, { event, reference: looksLikeTejjoraBooking ? reference : undefined });
    return apiError("WEBHOOK_PROCESSING_FAILED", `Webhook could not be processed (ref ${ref}).`, 503);
  }
}
