import "server-only";
import { randomUUID } from "node:crypto";
import { commerceConfig } from "@/data/commerce";
import type { BookingRequestPayload, ReservationRecord } from "@/types/booking";
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

function createReference() {
  const now = new Date();
  const y = String(now.getUTCFullYear()).slice(-2);
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const token = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `TLV-${y}${m}${d}-${token}`;
}

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
      reference: createReference(),
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

export async function getReservation(reference: string) {
  const store = await readBookingStore();
  return store.reservations.find((item) => item.reference === reference) ?? null;
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

export function applyVerifiedPaymentToStore(
  store: Awaited<ReturnType<typeof readBookingStore>>,
  reservation: ReservationRecord,
  paymentId: string,
  /** Amount the gateway reports as received, in paise. Omit when the order amount is already trusted. */
  receivedPaise?: number,
) {
  if (reservation.status === "confirmed" && reservation.paymentStatus === "paid") return reservation;

  const inventoryConflict = !reservationInventoryAvailable(store, reservation);
  // Orders are always created for the full stay total, so any other amount needs staff attention.
  const amountMismatch = receivedPaise != null && Number.isFinite(receivedPaise)
    && receivedPaise !== Math.round(reservation.pricing.grandTotal * 100);

  const requiresOperationalReview = reservation.status === "cancelled" || reservation.status === "completed";
  reservation.paymentId = paymentId || reservation.paymentId;
  reservation.paymentStatus = "paid";
  reservation.status = inventoryConflict || requiresOperationalReview || amountMismatch ? "payment_review" : "confirmed";
  reservation.expiresAt = null;
  reservation.pricing.amountPaid = amountMismatch ? receivedPaise / 100 : reservation.pricing.grandTotal;
  reservation.pricing.amountDue = Math.max(0, reservation.pricing.grandTotal - reservation.pricing.amountPaid);
  reservation.updatedAt = new Date().toISOString();
  return reservation;
}

export async function settleVerifiedPayment(reference: string, paymentId: string) {
  return withBookingStore((store) => {
    const reservation = store.reservations.find((item) => item.reference === reference);
    if (!reservation) throw new Error("Reservation not found.");
    return applyVerifiedPaymentToStore(store, reservation, paymentId);
  });
}
