import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { normalizePhoneE164 } from "@/lib/phone";
import { createBookingReference } from "./reference";
import { commerceConfig } from "@/data/commerce";
import type { BookingRequestPayload, PaymentLedgerEntry, ReservationRecord } from "@/types/booking";
import { calculateBookingPrice } from "./pricing";
import { stayNightlyRates } from "./operations";
import { availableRoomsOnDate } from "./capacity";
import { withBookingStore, readBookingStore } from "./store";
import {
  appendReservationAccessToken,
  createReservationAccessToken,
  guestCredentialsMatch,
  hashReservationAccessToken,
  normalizeGuestEmail,
  normalizeGuestPhone,
} from "./access";

/** A problem with the guest's request (shown to them), as opposed to a storage/server failure. */
export class BookingInputError extends Error {}


function stayDates(checkIn: string, checkOut: string) {
  const dates: string[] = [];
  const cursor = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function activeGuestHoldCount(store: Awaited<ReturnType<typeof readBookingStore>>, input: BookingRequestPayload) {
  const now = Date.now();
  const email = normalizeGuestEmail(input.guest.email);
  const phone = normalizeGuestPhone(input.guest.phone);
  return store.reservations.filter((reservation) => {
    if (reservation.status !== "initiated" && reservation.status !== "payment_pending") return false;
    if (reservation.expiresAt && Date.parse(reservation.expiresAt) <= now) return false;
    return normalizeGuestEmail(reservation.guest.email) === email || normalizeGuestPhone(reservation.guest.phone) === phone;
  }).length;
}

export async function createReservation(input: BookingRequestPayload): Promise<{ reservation: ReservationRecord; accessToken: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + commerceConfig.holdMinutes * 60_000).toISOString();
  const accessToken = createReservationAccessToken();

  const reservation = await withBookingStore(async (store) => {
    if (activeGuestHoldCount(store, input) >= 2) {
      throw new BookingInputError("There are already active room holds for this contact. Complete or let an existing hold expire before creating another.");
    }

    for (const date of stayDates(input.stay.checkIn, input.stay.checkOut)) {
      const capacity = availableRoomsOnDate(store, input.roomId, date);
      if (capacity.available < input.stay.rooms) {
        throw new BookingInputError("Selected room category is no longer available for these dates.");
      }
    }

    const nightlyRates = stayNightlyRates(store, input.roomId, input.stay.checkIn, input.stay.checkOut);
    let pricing: ReservationRecord["pricing"];
    try {
      pricing = calculateBookingPrice(input, 0, { nightlyRates });
    } catch (error) {
      throw new BookingInputError(error instanceof Error ? error.message : "The booking price could not be calculated.");
    }
    const record: ReservationRecord = {
      ...input,
      id: randomUUID(),
      reference: uniqueReference(store),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
      status: "payment_pending",
      paymentStatus: "not_started",
      pricing,
      accessTokenHash: hashReservationAccessToken(accessToken),
      confirmationEmailStatus: "not_sent",
    };
    store.reservations.push(record);
    return record;
  });

  return { reservation, accessToken };
}

function uniqueReference(store: Awaited<ReturnType<typeof readBookingStore>>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = createBookingReference();
    if (!store.reservations.some((item) => item.reference === reference)) return reference;
  }
  throw new Error("Could not allocate a unique booking reference.");
}

export async function getReservation(reference: string) {
  const store = await readBookingStore();
  return store.reservations.find((item) => item.reference === reference) ?? null;
}

/** Constant-time equality of two E.164 numbers; a stored number that cannot be normalised never matches. */
function samePhone(stored: string, supplied: string) {
  const a = Buffer.from(normalizePhoneE164(stored) ?? "invalid-stored-phone", "utf8");
  const b = Buffer.from(supplied, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Read-only guest lookup by reference + registered mobile. Writes nothing (no access token is
 * issued) and returns null for every failure, so callers cannot tell "no such booking" from
 * "wrong mobile". The comparison runs even when the reference is unknown.
 */
export async function lookupReservationByMobile(reference: string, mobileE164: string) {
  const store = await readBookingStore();
  const item = store.reservations.find((record) => record.reference === reference);
  const matched = samePhone(item?.guest.phone ?? "", mobileE164);
  return item && matched ? item : null;
}

export async function retrieveReservationWithCredentials(reference: string, email: string, phone: string) {
  const accessToken = createReservationAccessToken();
  const reservation = await withBookingStore((store) => {
    const item = store.reservations.find((record) => record.reference === reference.trim().toUpperCase());
    if (!item || !guestCredentialsMatch(item, email, phone)) return null;
    item.accessTokenHash = appendReservationAccessToken(item.accessTokenHash, accessToken);
    item.updatedAt = new Date().toISOString();
    return item;
  });
  return reservation ? { reservation, accessToken } : null;
}

export async function updateReservation(reference: string, update: (reservation: ReservationRecord) => void) {
  return withBookingStore((store) => {
    const reservation = store.reservations.find((item) => item.reference === reference);
    if (!reservation) throw new Error("Reservation not found.");
    update(reservation);
    reservation.updatedAt = new Date().toISOString();
    return reservation;
  });
}

/** True when every night of the stay still has enough rooms, ignoring this reservation's own hold. */
export function reservationInventoryAvailable(
  store: Awaited<ReturnType<typeof readBookingStore>>,
  reservation: ReservationRecord,
) {
  return stayDates(reservation.stay.checkIn, reservation.stay.checkOut).every((date) =>
    availableRoomsOnDate(store, reservation.roomId, date, { excludeReference: reservation.reference }).available >= reservation.stay.rooms,
  );
}

export type VerifiedPaymentInput = {
  /** Gateway payment id. Without one the event only names an order (see order-only ids below). */
  paymentId?: string | null;
  /** Gateway order the payment belongs to. */
  orderId?: string | null;
  /** Amount the gateway reports as received, in paise. Omit when unknown (browser verify). */
  amountPaise?: number | null;
  source: PaymentLedgerEntry["source"];
};

export type PaymentApplication = { reservation: ReservationRecord; changed: boolean; duplicate: boolean };

const ORDER_ONLY_PREFIX = "order:";

/** Ledger for a reservation, back-filling the single payment of records written before the ledger existed. */
function paymentLedger(reservation: ReservationRecord): PaymentLedgerEntry[] {
  if (reservation.payments?.length) return reservation.payments;
  if (reservation.paymentStatus === "paid" && reservation.paymentId) {
    return [{
      paymentId: reservation.paymentId,
      amountPaise: Math.round(reservation.pricing.amountPaid * 100),
      amountSource: "order",
      orderId: reservation.paymentOrderId,
      orderMatched: true,
      source: "legacy",
      recordedAt: reservation.updatedAt,
    }];
  }
  return [];
}

/**
 * Applies one verified (signature-checked) gateway payment to a reservation. Must run inside
 * withBookingStore so it sees the latest state. Rules:
 * - Idempotent: a payment id is recorded once; a later gateway-reported amount only replaces an
 *   amount that had been inferred from the order.
 * - Accumulating: distinct payments are summed into amountPaid; nothing is overwritten.
 * - Protective: "payment_review" is never downgraded to "confirmed" automatically. Anything other
 *   than exactly one matched, fully-paid order (mismatched order, unknown or wrong total,
 *   inventory conflict, cancelled/completed stay) goes to, or stays in, review.
 */
export function applyVerifiedPaymentToStore(
  store: Awaited<ReturnType<typeof readBookingStore>>,
  reservation: ReservationRecord,
  input: VerifiedPaymentInput,
): PaymentApplication {
  const ledger = paymentLedger(reservation).map((entry) => ({ ...entry }));
  const orderId = input.orderId?.trim() || undefined;
  const orderMatched = Boolean(orderId && reservation.paymentOrderId === orderId);
  const gatewayAmount = typeof input.amountPaise === "number" && Number.isFinite(input.amountPaise) && input.amountPaise >= 0
    ? Math.round(input.amountPaise)
    : undefined;
  const paymentId = input.paymentId?.trim() || (orderId ? `${ORDER_ONLY_PREFIX}${orderId}` : "");
  if (!paymentId) return { reservation, changed: false, duplicate: false };

  const isOrderOnly = paymentId.startsWith(ORDER_ONLY_PREFIX);
  const existing = ledger.find((entry) => entry.paymentId === paymentId)
    // An order-level event for an order that already has a recorded payment is the same money.
    ?? (isOrderOnly ? ledger.find((entry) => entry.orderId === orderId) : undefined);

  if (existing) {
    if (gatewayAmount == null || existing.amountSource === "gateway") return { reservation, changed: false, duplicate: true };
    existing.amountPaise = gatewayAmount;
    existing.amountSource = "gateway";
  } else {
    // A real payment id replaces an earlier order-only placeholder for the same order.
    const placeholderIndex = !isOrderOnly && orderId
      ? ledger.findIndex((entry) => entry.paymentId === `${ORDER_ONLY_PREFIX}${orderId}`)
      : -1;
    const placeholder = placeholderIndex >= 0 ? ledger[placeholderIndex] : undefined;
    // The reservation's own order is always created for the amount due, so a matched order with
    // no gateway amount is credited with that amount; an unmatched one cannot be valued.
    const inferredPaise = orderMatched ? Math.round(reservation.pricing.amountDue * 100) : 0;
    const entry: PaymentLedgerEntry = {
      paymentId,
      amountPaise: gatewayAmount ?? placeholder?.amountPaise ?? inferredPaise,
      amountSource: gatewayAmount != null ? "gateway" : placeholder?.amountSource ?? (orderMatched ? "order" : "unverified"),
      ...(orderId ? { orderId } : {}),
      orderMatched: Boolean(placeholder?.orderMatched) || orderMatched,
      source: input.source,
      recordedAt: new Date().toISOString(),
    };
    if (placeholderIndex >= 0) ledger.splice(placeholderIndex, 1, entry);
    else ledger.push(entry);
  }

  const previousStatus = reservation.status;
  const totalPaise = ledger.reduce((sum, entry) => sum + entry.amountPaise, 0);
  const expectedPaise = Math.round(reservation.pricing.grandTotal * 100);
  const needsReview = previousStatus === "payment_review"
    || previousStatus === "cancelled"
    || previousStatus === "completed"
    || ledger.some((entry) => !entry.orderMatched || entry.amountSource === "unverified")
    || totalPaise !== expectedPaise
    || !reservationInventoryAvailable(store, reservation);

  reservation.payments = ledger;
  if (!isOrderOnly || !reservation.paymentId) reservation.paymentId = paymentId;
  reservation.paymentStatus = "paid";
  reservation.status = needsReview ? "payment_review" : "confirmed";
  reservation.expiresAt = null;
  reservation.pricing.amountPaid = totalPaise / 100;
  reservation.pricing.amountDue = Math.max(0, reservation.pricing.grandTotal - reservation.pricing.amountPaid);
  reservation.updatedAt = new Date().toISOString();
  return { reservation, changed: true, duplicate: false };
}

/** Browser verification path: re-reads the reservation inside the store lock before applying. */
export async function settleVerifiedPayment(reference: string, input: VerifiedPaymentInput) {
  return withBookingStore((store) => {
    const reservation = store.reservations.find((item) => item.reference === reference);
    if (!reservation) throw new Error("Reservation not found.");
    return applyVerifiedPaymentToStore(store, reservation, input).reservation;
  });
}
