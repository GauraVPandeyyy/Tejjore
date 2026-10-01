import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ReservationRecord } from "@/types/booking";
import type { PaymentOrder, PaymentProvider, PaymentVerificationInput } from "./provider";

export type PaymentMode = "razorpay" | "test" | "unavailable";

export function paymentMode(): PaymentMode {
  if (process.env.NODE_ENV === "production") {
    const productionReady = process.env.BOOKING_PRODUCTION_READY === "true";
    const productionMode = process.env.BOOKING_MODE === "production";
    const persistentStoreConfigured = Boolean(process.env.DATABASE_URL?.trim());
    if (!productionReady || !productionMode || !persistentStoreConfigured) return "unavailable";
  }
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "razorpay";
  if (process.env.PAYMENT_TEST_MODE === "true" && process.env.NODE_ENV !== "production") return "test";
  return "unavailable";
}

export function paymentPublicKey() {
  return paymentMode() === "razorpay" ? process.env.RAZORPAY_KEY_ID ?? null : null;
}

export async function createPaymentOrder(reservation: ReservationRecord) {
  const mode = paymentMode();
  if (mode === "unavailable") throw new Error("Online payment is not configured.");
  if (mode === "test") {
    return {
      id: `test_order_${reservation.reference}`,
      amount: reservation.pricing.amountDue * 100,
      currency: "INR",
      receipt: reservation.reference,
      mode,
      keyId: null,
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const authorization = Buffer.from(`${keyId}:${secret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: reservation.pricing.amountDue * 100,
      currency: "INR",
      receipt: reservation.reference,
      notes: { booking_reference: reservation.reference },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Razorpay order creation failed.");
  const data = await response.json() as { id: string; amount: number; currency: string; receipt: string };
  return { ...data, mode, keyId };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const razorpayPaymentProvider: PaymentProvider = {
  id: "razorpay",
  async createOrder(reservation) {
    const order = await createPaymentOrder(reservation);
    if (order.mode !== "razorpay") throw new Error("Razorpay credentials are not configured.");
    return order as PaymentOrder;
  },
  verify(input: PaymentVerificationInput) {
    return verifyRazorpaySignature(input.orderId, input.paymentId, input.signature);
  },
  async refund(paymentId, amountPaise) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error("Razorpay credentials are not configured.");
    const authorization = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json" },
      body: JSON.stringify(amountPaise ? { amount: amountPaise } : {}),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Razorpay refund request failed.");
    return response.json() as Promise<{ id: string; status: string }>;
  },
};
