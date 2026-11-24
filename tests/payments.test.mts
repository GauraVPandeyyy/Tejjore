import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, test } from "node:test";
import { isolateEnv, makeReservation, setEnv, writeStore } from "./setup/env.mts";

const WEBHOOK_SECRET = "test-webhook-secret";
const KEY_SECRET = "test-key-secret";
const { storePath } = isolateEnv({
  RAZORPAY_KEY_ID: "rzp_test_key",
  RAZORPAY_KEY_SECRET: KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
});

const { applyVerifiedPaymentToStore } = await import("../src/lib/booking/reservations");
const { normalizeOperationsConfig } = await import("../src/lib/booking/operations");
const { hashReservationAccessToken } = await import("../src/lib/booking/access");
const { resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const verifyRoute = await import("../src/app/api/payments/verify/route");
const webhookRoute = await import("../src/app/api/payments/webhook/route");
type ReservationRecord = import("../src/types/booking").ReservationRecord;

const ACCESS_TOKEN = "guest-access-token";

function memoryStore(reservation: ReservationRecord) {
  return { reservations: [reservation], blocks: [], processedWebhookIds: [] as string[], operations: normalizeOperationsConfig(null) };
}

function readReservation() {
  const data = JSON.parse(readFileSync(storePath, "utf8")) as { reservations: ReservationRecord[] };
  return data.reservations[0];
}

function webhookRequest(body: object, eventId: string) {
  const raw = JSON.stringify(body);
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
  return new Request("http://localhost:3000/api/payments/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-razorpay-signature": signature, "x-razorpay-event-id": eventId },
    body: raw,
  });
}

function capturedEvent(paymentId: string, orderId: string, amountPaise: number, reference = "TLV-261004-ABC123") {
  return {
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: amountPaise, notes: { booking_reference: reference } } } },
  };
}

function verifyRequest(orderId: string, paymentId: string) {
  const signature = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return new Request("http://localhost:3000/api/payments/verify", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({
      reference: "TLV-261004-ABC123",
      accessToken: ACCESS_TOKEN,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }),
  });
}

function storedReservation(overrides: Partial<ReservationRecord> = {}) {
  return makeReservation({ accessTokenHash: hashReservationAccessToken(ACCESS_TOKEN), ...overrides });
}

beforeEach(() => resetMemoryRateLimits());

describe("payment ledger (applyVerifiedPaymentToStore)", () => {
  test("webhook amount mismatch → review; browser verify afterwards never downgrades it", () => {
    const reservation = makeReservation();
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", amountPaise: 300_000, source: "webhook" });
    assert.equal(reservation.status, "payment_review");
    assert.equal(reservation.pricing.amountPaid, 3000);

    const result = applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", source: "browser-verify" });
    assert.equal(result.duplicate, true);
    assert.equal(reservation.status, "payment_review", "payment_review must be protective");
    assert.equal(reservation.pricing.amountPaid, 3000, "verify must not reset amountPaid to the grand total");
    assert.equal(reservation.payments?.length, 1);
  });

  test("payment_review set for any reason is never auto-confirmed by a later valid payment", () => {
    const reservation = makeReservation({ status: "payment_review", paymentStatus: "pending" });
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_9", orderId: "order_A", source: "browser-verify" });
    assert.equal(reservation.status, "payment_review");
    assert.equal(reservation.paymentStatus, "paid");
  });

  test("browser verify → webhook for the same payment stays confirmed and adopts the gateway amount", () => {
    const reservation = makeReservation();
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", source: "browser-verify" });
    assert.equal(reservation.status, "confirmed");
    assert.equal(reservation.pricing.amountPaid, 4000);

    const result = applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", amountPaise: 400_000, source: "webhook" });
    assert.equal(result.changed, true);
    assert.equal(reservation.status, "confirmed");
    assert.equal(reservation.payments?.length, 1);
    assert.equal(reservation.payments?.[0].amountSource, "gateway");
  });

  test("repeating the same valid payment is idempotent", () => {
    const reservation = makeReservation();
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", amountPaise: 400_000, source: "webhook" });
    const before = JSON.stringify(reservation);
    const again = applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", amountPaise: 400_000, source: "webhook" });
    const verify = applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", source: "browser-verify" });
    assert.equal(again.duplicate, true);
    assert.equal(verify.duplicate, true);
    assert.equal(JSON.stringify(reservation), before);
    assert.equal(reservation.status, "confirmed");
  });

  test("two distinct payments accumulate (never overwrite) and require review", () => {
    const reservation = makeReservation();
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", amountPaise: 400_000, source: "webhook" });
    assert.equal(reservation.status, "confirmed");
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_2", orderId: "order_OLD", amountPaise: 400_000, source: "webhook" });
    assert.deepEqual(reservation.payments?.map((entry) => entry.paymentId), ["pay_1", "pay_2"]);
    assert.equal(reservation.pricing.amountPaid, 8000);
    assert.equal(reservation.pricing.amountDue, 0);
    assert.equal(reservation.status, "payment_review");
  });

  test("a record paid before the ledger existed keeps its original payment", () => {
    const reservation = makeReservation({ status: "confirmed", paymentStatus: "paid", paymentId: "pay_legacy", pricing: { ...makeReservation().pricing, amountPaid: 4000, amountDue: 0 } });
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_new", orderId: "order_A", amountPaise: 100_000, source: "webhook" });
    assert.deepEqual(reservation.payments?.map((entry) => entry.paymentId), ["pay_legacy", "pay_new"]);
    assert.equal(reservation.pricing.amountPaid, 5000);
    assert.equal(reservation.status, "payment_review");
  });

  test("an order-only event and the later real payment id for that order count once", () => {
    const reservation = makeReservation();
    const store = memoryStore(reservation);
    applyVerifiedPaymentToStore(store, reservation, { orderId: "order_A", amountPaise: 400_000, source: "webhook" });
    applyVerifiedPaymentToStore(store, reservation, { paymentId: "pay_1", orderId: "order_A", amountPaise: 400_000, source: "webhook" });
    assert.equal(reservation.payments?.length, 1);
    assert.equal(reservation.payments?.[0].paymentId, "pay_1");
    assert.equal(reservation.pricing.amountPaid, 4000);
    assert.equal(reservation.status, "confirmed");
  });
});

describe("payment routes (JSON store, signed requests)", () => {
  test("race: webhook marks review first, then the browser verify route returns review and keeps the gateway amount", async () => {
    writeStore(storePath, [storedReservation()]);
    const hook = await webhookRoute.POST(webhookRequest(capturedEvent("pay_1", "order_A", 250_000), "evt_1"));
    assert.equal(hook.status, 200);
    assert.equal(readReservation().status, "payment_review");

    const verify = await verifyRoute.POST(verifyRequest("order_A", "pay_1"));
    assert.equal(verify.status, 200);
    const body = await verify.json() as { status: string; reviewRequired: boolean };
    assert.equal(body.status, "payment_review");
    assert.equal(body.reviewRequired, true);
    const after = readReservation();
    assert.equal(after.status, "payment_review");
    assert.equal(after.pricing.amountPaid, 2500);
    assert.equal(after.payments?.length, 1);
  });

  test("race: browser verify first, then webhook for the same payment keeps it confirmed", async () => {
    writeStore(storePath, [storedReservation()]);
    const verify = await verifyRoute.POST(verifyRequest("order_A", "pay_1"));
    assert.equal(verify.status, 200);
    assert.equal(readReservation().status, "confirmed");

    const hook = await webhookRoute.POST(webhookRequest(capturedEvent("pay_1", "order_A", 400_000), "evt_2"));
    assert.equal(hook.status, 200);
    const after = readReservation();
    assert.equal(after.status, "confirmed");
    assert.equal(after.pricing.amountPaid, 4000);
    assert.equal(after.payments?.length, 1);
  });

  test("duplicate webhook delivery is processed once", async () => {
    writeStore(storePath, [storedReservation()]);
    const event = capturedEvent("pay_1", "order_A", 400_000);
    const first = await webhookRoute.POST(webhookRequest(event, "evt_dup"));
    const second = await webhookRoute.POST(webhookRequest(event, "evt_dup"));
    assert.equal(((await first.json()) as { duplicate: boolean }).duplicate, false);
    assert.equal(((await second.json()) as { duplicate: boolean }).duplicate, true);
    assert.equal(readReservation().payments?.length, 1);
    assert.equal(readReservation().pricing.amountPaid, 4000);
  });

  test("repeated browser verification of a paid booking changes nothing", async () => {
    writeStore(storePath, [storedReservation()]);
    await verifyRoute.POST(verifyRequest("order_A", "pay_1"));
    const once = JSON.stringify({ ...readReservation(), updatedAt: "" });
    const again = await verifyRoute.POST(verifyRequest("order_A", "pay_1"));
    assert.equal(again.status, 200);
    assert.equal(JSON.stringify({ ...readReservation(), updatedAt: "" }), once);
  });

  test("two distinct payments through the webhook accumulate in amountPaid", async () => {
    writeStore(storePath, [storedReservation()]);
    await webhookRoute.POST(webhookRequest(capturedEvent("pay_1", "order_A", 400_000), "evt_a"));
    await webhookRoute.POST(webhookRequest(capturedEvent("pay_2", "order_B", 400_000), "evt_b"));
    const after = readReservation();
    assert.deepEqual(after.payments?.map((entry) => entry.paymentId), ["pay_1", "pay_2"]);
    assert.equal(after.pricing.amountPaid, 8000);
    assert.equal(after.status, "payment_review");
  });

  test("webhook is rejected (503, retriable) when the secret is not configured", async () => {
    setEnv({ RAZORPAY_WEBHOOK_SECRET: "" });
    try {
      writeStore(storePath, [storedReservation()]);
      const response = await webhookRoute.POST(webhookRequest(capturedEvent("pay_1", "order_A", 400_000), "evt_nosecret"));
      assert.equal(response.status, 503);
      const body = await response.json() as { error: { code: string; message: string } };
      assert.equal(body.error.code, "WEBHOOK_UNAVAILABLE");
      assert.equal(JSON.stringify(body).includes(WEBHOOK_SECRET), false);
      assert.equal(readReservation().paymentStatus, "pending", "nothing may be applied without a verified signature");
    } finally {
      setEnv({ RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET });
    }
  });

  test("webhook with an invalid signature is rejected", async () => {
    writeStore(storePath, [storedReservation()]);
    const request = new Request("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64) },
      body: JSON.stringify(capturedEvent("pay_1", "order_A", 400_000)),
    });
    const response = await webhookRoute.POST(request);
    assert.equal(response.status, 401);
    assert.equal(readReservation().paymentStatus, "pending");
  });
});
