import "server-only";
import type { BookingStoreData } from "./store";
import type { ReservationRecord } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { effectiveRoomTotal } from "./operations";

export function reservationOccupiesDate(reservation: ReservationRecord, date: string) {
  return reservation.stay.checkIn <= date && reservation.stay.checkOut > date;
}

export function reservationConsumesInventory(reservation: ReservationRecord, now = Date.now()) {
  if (reservation.status === "confirmed" || reservation.status === "payment_review") return true;
  if (reservation.status !== "initiated" && reservation.status !== "payment_pending") return false;
  if (!reservation.expiresAt) return true;
  return Date.parse(reservation.expiresAt) > now;
}

export function committedRoomsOnDate(
  store: BookingStoreData,
  roomId: RoomId,
  date: string,
  options?: { excludeReference?: string; now?: number },
) {
  const now = options?.now ?? Date.now();
  return store.reservations.reduce((sum, reservation) => {
    if (reservation.reference === options?.excludeReference) return sum;
    if (reservation.roomId !== roomId || !reservationOccupiesDate(reservation, date)) return sum;
    return reservationConsumesInventory(reservation, now) ? sum + reservation.stay.rooms : sum;
  }, 0);
}

export function blockedRoomsOnDate(store: BookingStoreData, roomId: RoomId, date: string) {
  return store.blocks
    .filter((block) => block.roomId === roomId && block.date === date)
    .reduce((sum, block) => sum + block.quantity, 0);
}

export function availableRoomsOnDate(
  store: BookingStoreData,
  roomId: RoomId,
  date: string,
  options?: { excludeReference?: string; now?: number },
) {
  const total = effectiveRoomTotal(store, roomId, date);
  const committed = committedRoomsOnDate(store, roomId, date, options);
  const blocked = blockedRoomsOnDate(store, roomId, date);
  return { total, committed, blocked, available: Math.max(0, total - committed - blocked) };
}
