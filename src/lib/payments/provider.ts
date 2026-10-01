import "server-only";
import type { ReservationRecord } from "@/types/booking";

export type PaymentOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  mode: "razorpay" | "test";
  keyId: string | null;
};

export type PaymentVerificationInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

export interface PaymentProvider {
  readonly id: "razorpay" | "test";
  createOrder(reservation: ReservationRecord): Promise<PaymentOrder>;
  verify(input: PaymentVerificationInput): boolean;
  /** Refunds are intentionally server-side and will be exposed to staff only after policy/admin rules are configured. */
  refund?(paymentId: string, amountPaise?: number): Promise<{ id: string; status: string }>;
}
