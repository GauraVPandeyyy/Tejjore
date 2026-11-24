import { NextResponse } from "next/server";
import { commerceConfig } from "@/data/commerce";
import { reservationAccessMatches } from "@/lib/booking/access";
import { reservationConsumesInventory } from "@/lib/booking/capacity";
import { reservationInventoryAvailable } from "@/lib/booking/reservations";
import { withBookingStore } from "@/lib/booking/store";
import { createPaymentOrder, paymentMode, paymentPublicKey } from "@/lib/payments/razorpay";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "payment-order", { limit: 12, windowMs: 15 * 60_000 }, "Too many payment attempts. Please wait and try again.");
  if (limited) return limited;

  const body = await readJsonBody<{ reference?: string; accessToken?: string }>(request);
  if (!body?.reference || !body.accessToken) return apiError("ACCESS_REQUIRED", "Verified booking access is required.", 400);
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

      if (mode === "unavailable") throw new Error("PAYMENT_UNAVAILABLE");
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
    if (code === "ACCESS_DENIED") return apiError("ACCESS_DENIED", "Reservation access could not be verified.", 403);
    if (code === "PAYMENT_RECEIVED") return apiError("PAYMENT_RECEIVED", "Payment has already been received for this reservation.", 409);
    if (code === "PAYMENT_CLOSED") return apiError("PAYMENT_CLOSED", "This reservation can no longer accept online payment.", 409);
    if (code === "ROOMS_UNAVAILABLE") return apiError("ROOMS_UNAVAILABLE", "The selected rooms are no longer available for these dates. Please search again.", 409);
    if (code === "PAYMENT_UNAVAILABLE") return apiError("PAYMENT_UNAVAILABLE", "Online payment is not available right now. The hotel can help you complete this booking.", 503);
    if (code === "HOLD_EXPIRED") return apiError("HOLD_EXPIRED", "The temporary inventory hold has expired. Please search again.", 409);
    return internalError("payments/order", error, "Online payment could not be started right now. Please try again shortly.", { reference });
  }
}
