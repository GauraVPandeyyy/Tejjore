import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReservationRecord } from "../../src/types/booking";

/** Isolated environment for tests: JSON store in a temp dir, no live services. */
export function isolateEnv(extra: Record<string, string | undefined> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "tejjora-test-"));
  const values: Record<string, string | undefined> = {
    NODE_ENV: "test",
    DATABASE_URL: "",
    BOOKING_MODE: "development",
    BOOKING_STORE_PATH: path.join(dir, "store.json"),
    BREVO_API_KEY: "",
    GEMINI_API_KEY: "",
    CONCIERGE_LANGUAGE_PROVIDER: "",
    RAZORPAY_KEY_ID: "",
    RAZORPAY_KEY_SECRET: "",
    RAZORPAY_WEBHOOK_SECRET: "",
    PAYMENT_TEST_MODE: "false",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    TRUSTED_CLIENT_IP_HEADER: "",
    ...extra,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else (process.env as Record<string, string>)[key] = value;
  }
  return { dir, storePath: values.BOOKING_STORE_PATH! };
}

export function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else (process.env as Record<string, string>)[key] = value;
  }
}

function futureDate(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

export function makeReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  const now = new Date().toISOString();
  return {
    id: "res-1",
    reference: "TLV-261004-ABC123",
    roomId: "deluxe",
    ratePlanId: "room-only",
    addonIds: [],
    source: "website",
    stay: { checkIn: futureDate(30), checkOut: futureDate(32), adults: 2, children: 0, rooms: 1 },
    guest: {
      firstName: "Asha",
      lastName: "Verma",
      phone: "+91 98765 43210",
      email: "asha@example.test",
      preferredContact: "phone",
      specialRequests: "Late arrival",
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    status: "payment_pending",
    paymentStatus: "pending",
    paymentOrderId: "order_A",
    accessTokenHash: "deadbeef",
    pricing: {
      currency: "INR",
      nights: 2,
      baseRatePerRoomNight: 2000,
      roomSubtotal: 4000,
      rateAdjustment: 0,
      extraGuestCharge: 0,
      childrenCharge: 0,
      extrasTotal: 0,
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      grandTotal: 4000,
      amountPaid: 0,
      amountDue: 4000,
      hasUnconfiguredCharges: false,
    },
    ...overrides,
  };
}

export function writeStore(storePath: string, reservations: ReservationRecord[], processedWebhookIds: string[] = []) {
  writeFileSync(storePath, JSON.stringify({ reservations, blocks: [], processedWebhookIds }, null, 2));
}
