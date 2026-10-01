import "server-only";
import type { AvailabilityRoom } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { readBookingStore } from "./store";
import { effectiveRoomRate, effectiveRoomTotal, operationalRoomIds, stayNightlyRates } from "./operations";
import { blockedRoomsOnDate, committedRoomsOnDate } from "./capacity";

function datesBetween(checkIn: string, checkOut: string) {
  const dates: string[] = [];
  const cursor = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function bookingEnvironmentMode(): "development" | "production" {
  return process.env.BOOKING_MODE === "production" ? "production" : "development";
}

export async function configuredTotal(roomId: RoomId, date = new Date().toISOString().slice(0, 10)) {
  const store = await readBookingStore();
  return effectiveRoomTotal(store, roomId, date);
}

export async function searchAvailability(checkIn: string, checkOut: string): Promise<AvailabilityRoom[]> {
  const store = await readBookingStore();
  const dates = datesBetween(checkIn, checkOut);
  const now = Date.now();

  return operationalRoomIds.map((roomId) => {
    let minTotal = Number.POSITIVE_INFINITY;
    let maxBooked = 0;
    let maxHeld = 0;
    let maxBlocked = 0;
    let minAvailable = Number.POSITIVE_INFINITY;

    for (const date of dates) {
      const total = effectiveRoomTotal(store, roomId, date);
      minTotal = Math.min(minTotal, total);
      let booked = 0;
      let held = 0;
      for (const reservation of store.reservations) {
        if (reservation.roomId !== roomId || !(reservation.stay.checkIn <= date && reservation.stay.checkOut > date)) continue;
        const expired = reservation.expiresAt ? Date.parse(reservation.expiresAt) <= now : false;
        if (reservation.status === "confirmed" || reservation.status === "payment_review") booked += reservation.stay.rooms;
        else if ((reservation.status === "initiated" || reservation.status === "payment_pending") && !expired) held += reservation.stay.rooms;
      }
      const blocked = blockedRoomsOnDate(store, roomId, date);
      const committed = committedRoomsOnDate(store, roomId, date, { now });
      maxBooked = Math.max(maxBooked, booked);
      maxHeld = Math.max(maxHeld, held);
      maxBlocked = Math.max(maxBlocked, blocked);
      minAvailable = Math.min(minAvailable, Math.max(0, total - committed - blocked));
    }

    const nightlyRates = stayNightlyRates(store, roomId, checkIn, checkOut);
    return {
      roomId,
      total: Number.isFinite(minTotal) ? minTotal : effectiveRoomTotal(store, roomId, checkIn),
      booked: maxBooked,
      held: maxHeld,
      blocked: maxBlocked,
      available: Number.isFinite(minAvailable) ? minAvailable : 0,
      baseRate: nightlyRates[0]?.rate ?? effectiveRoomRate(store, roomId, checkIn),
      nightlyRates,
    };
  });
}
