import { NextResponse } from "next/server";
import { commerceConfig } from "@/data/commerce";
import { reservationAccessMatches } from "@/lib/booking/access";
import { reservationConsumesInventory } from "@/lib/booking/capacity";
import { reservationInventoryAvailable } from "@/lib/booking/reservations";
import { withBookingStore } from "@/lib/booking/store";
import { createPaymentOrder, paymentMode, paymentPublicKey } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "payment-order", { limit: 12, windowMs: 15 * 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many payment attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const body = await request.json().catch(() => null) as { reference?: string; accessToken?: string } | null;
  if (!body?.reference || !body.accessToken) return NextResponse.json({ error: "Verified booking access is required." }, { status: 400 });
  const reference = body.reference.trim().toUpperCase();

  try {
    // Keep the reservation check + provider order creation + order-id persistence in one
    // store transaction. This prevents rapid duplicate clicks from creating two payable
    // gateway orders for the same reservation on a single shared booking store.
    const order = await withBookingStore(async (store) => {
      const reservation = store.reservations.find((item) => item.reference === reference);
      if (!reservation || !reservationAccessMatches(reservation, body.accessToken!)) {
        throw new Error("ACCESS_DENIED");
      }
      if (reservation.status === "confirmed" || reservation.status === "payment_review" || reservation.paymentStatus === "paid") {
        throw new Error("PAYMENT_RECEIVED");
      }
      if (reservation.status === "cancelled" || reservation.status === "completed") {
        throw new Error("PAYMENT_CLOSED");
      }
      if (reservation.expiresAt && Date.parse(reservation.expiresAt) <= Date.now()) {
        throw new Error("HOLD_EXPIRED");
      }

      const mode = paymentMode();
      // A failed attempt leaves the Razorpay order payable, so retries reuse it.
      const orderReusable = reservation.paymentStatus === "pending" || reservation.paymentStatus === "failed";
      if (reservation.paymentOrderId && orderReusable && mode !== "unavailable") {
        return {
          id: reservation.paymentOrderId,
          amount: reservation.pricing.amountDue * 100,
          currency: "INR",
          receipt: reservation.reference,
          mode,
          keyId: mode === "razorpay" ? paymentPublicKey() : null,
        };
      }

      // A reservation whose hold no longer counts against inventory (e.g. a legacy
      // payment_failed record) must not be re-held without checking the rooms are still free.
      if (!reservationConsumesInventory(reservation) && !reservationInventoryAvailable(store, reservation)) {
        throw new Error("ROOMS_UNAVAILABLE");
      }

      const created = await createPaymentOrder(reservation);
      reservation.paymentOrderId = created.id;
      reservation.paymentStatus = "pending";
      reservation.status = "payment_pending";
      reservation.expiresAt = new Date(Date.now() + commerceConfig.holdMinutes * 60_000).toISOString();
      reservation.updatedAt = new Date().toISOString();
      return created;
    });

    return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ACCESS_DENIED") return NextResponse.json({ error: "Reservation access could not be verified." }, { status: 403 });
    if (code === "PAYMENT_RECEIVED") return NextResponse.json({ error: "Payment has already been received for this reservation." }, { status: 409 });
    if (code === "PAYMENT_CLOSED") return NextResponse.json({ error: "This reservation can no longer accept online payment." }, { status: 409 });
    if (code === "ROOMS_UNAVAILABLE") return NextResponse.json({ error: "The selected rooms are no longer available for these dates. Please search again." }, { status: 409 });
    if (code === "HOLD_EXPIRED")return NextResponse.json({ error: "The temporary inventory hold has expired. Please search again." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment order could not be created." }, { status: 503 });
  }
}
