import "server-only";
import { randomUUID } from "node:crypto";
import type { AdminOverview, AdminReservationPatch, DateInventoryOverride } from "@/types/admin";
import type { ReservationRecord, ReservationStatus } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { effectiveRoomRate, effectiveRoomTotal, normalizeOperationsConfig, operationalRoomIds } from "@/lib/booking/operations";
import { availableRoomsOnDate, blockedRoomsOnDate, committedRoomsOnDate } from "@/lib/booking/capacity";
import { validIsoDate } from "@/lib/booking/validation";
import { readBookingStore, withBookingStore } from "@/lib/booking/store";

function indiaDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function indiaDateFromInstant(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

function occupies(reservation: ReservationRecord, date: string) {
  return reservation.stay.checkIn <= date && reservation.stay.checkOut > date;
}

function activeHold(reservation: ReservationRecord) {
  if (!["initiated", "payment_pending"].includes(reservation.status)) return false;
  return !reservation.expiresAt || Date.parse(reservation.expiresAt) > Date.now();
}

function countsForDate(store: Awaited<ReturnType<typeof readBookingStore>>, roomId: RoomId, date: string) {
  let booked = 0;
  let held = 0;
  for (const reservation of store.reservations) {
    if (reservation.roomId !== roomId || !occupies(reservation, date)) continue;
    if (reservation.status === "confirmed" || reservation.status === "payment_review") booked += reservation.stay.rooms;
    else if (activeHold(reservation)) held += reservation.stay.rooms;
  }
  const blocked = store.blocks
    .filter((block) => block.roomId === roomId && block.date === date)
    .reduce((sum, block) => sum + block.quantity, 0);
  const total = effectiveRoomTotal(store, roomId, date);
  return { total, booked, held, blocked, available: Math.max(0, total - booked - held - blocked) };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const store = await readBookingStore();
  const today = indiaDate();
  const activeConfirmed = store.reservations.filter((item) => item.status === "confirmed");
  const arrivals = activeConfirmed.filter((item) => item.stay.checkIn === today).length;
  const departures = activeConfirmed.filter((item) => item.stay.checkOut === today).length;
  const inHouse = activeConfirmed.filter((item) => occupies(item, today)).length;
  const occupiedRooms = activeConfirmed.filter((item) => occupies(item, today)).reduce((sum, item) => sum + item.stay.rooms, 0);
  const totalRooms = operationalRoomIds.reduce((sum, roomId) => sum + effectiveRoomTotal(store, roomId, today), 0);
  const pendingPayments = store.reservations.filter((item) => activeHold(item)).length;
  const paymentReviews = store.reservations.filter((item) => item.status === "payment_review").length;
  const confirmedToday = activeConfirmed.filter((item) => indiaDateFromInstant(item.updatedAt) === today).length;
  const inventory: AdminOverview["inventory"] = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = indiaDate(offset);
    for (const roomId of operationalRoomIds) {
      const counts = countsForDate(store, roomId, date);
      inventory.push({ date, roomId, ...counts, baseRate: effectiveRoomRate(store, roomId, date) });
    }
  }
  const reservations = [...store.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    generatedAt: new Date().toISOString(),
    today,
    metrics: {
      arrivals, departures, inHouse, pendingPayments, paymentReviews, confirmedToday, occupiedRooms, totalRooms,
      occupancyPercent: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    },
    reservations,
    inventory,
    blocks: [...store.blocks].sort((a, b) => a.date.localeCompare(b.date)),
    operations: normalizeOperationsConfig(store.operations),
  };
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

function relevantInventoryDates(store: Awaited<ReturnType<typeof readBookingStore>>, roomId: RoomId) {
  const values = new Set<string>();
  for (const block of store.blocks) if (block.roomId === roomId) values.add(block.date);
  for (const reservation of store.reservations) {
    if (reservation.roomId !== roomId) continue;
    for (const date of stayDates(reservation.stay.checkIn, reservation.stay.checkOut)) values.add(date);
  }
  for (const override of normalizeOperationsConfig(store.operations).dateOverrides) {
    if (override.roomId === roomId) values.add(override.date);
  }
  return [...values];
}

function requiredInventory(store: Awaited<ReturnType<typeof readBookingStore>>, roomId: RoomId, date: string) {
  return committedRoomsOnDate(store, roomId, date) + blockedRoomsOnDate(store, roomId, date);
}

const allowedStatuses = new Set<ReservationStatus>(["confirmed", "cancelled", "completed"]);

export async function patchAdminReservation(reference: string, patch: AdminReservationPatch) {
  return withBookingStore((store) => {
    const reservation = store.reservations.find((item) => item.reference === reference);
    if (!reservation) throw new Error("Reservation not found.");
    if (typeof patch.staffNotes === "string") reservation.staffNotes = patch.staffNotes.slice(0, 2000);
    if (patch.status) {
      if (!allowedStatuses.has(patch.status)) throw new Error("Unsupported reservation status.");
      if (patch.status === "confirmed" && reservation.paymentStatus !== "paid" && process.env.ADMIN_ALLOW_MANUAL_CONFIRM !== "true") {
        throw new Error("A reservation can only be manually confirmed without verified payment when ADMIN_ALLOW_MANUAL_CONFIRM=true.");
      }
      if (patch.status === "confirmed" && reservation.status !== "confirmed") {
        for (const date of stayDates(reservation.stay.checkIn, reservation.stay.checkOut)) {
          const capacity = availableRoomsOnDate(store, reservation.roomId, date, { excludeReference: reservation.reference });
          if (capacity.available < reservation.stay.rooms) {
            throw new Error(`This reservation cannot be confirmed because the category no longer has enough inventory on ${date}.`);
          }
        }
      }
      if (patch.status === "completed" && reservation.status !== "confirmed") throw new Error("Only a confirmed reservation can be completed.");
      reservation.status = patch.status;
      if (patch.status === "cancelled" || patch.status === "completed" || patch.status === "confirmed") reservation.expiresAt = null;
    }
    reservation.updatedAt = new Date().toISOString();
    return reservation;
  });
}

export async function updateRoomSetting(roomId: RoomId, input: { baseRate: number; totalInventory: number }) {
  if (!operationalRoomIds.includes(roomId)) throw new Error("Unknown room category.");
  if (!Number.isInteger(input.baseRate) || input.baseRate < 0 || input.baseRate > 1_000_000) throw new Error("Enter a valid base rate.");
  if (!Number.isInteger(input.totalInventory) || input.totalInventory < 0 || input.totalInventory > 100) throw new Error("Enter a valid inventory count.");
  return withBookingStore((store) => {
    const operations = normalizeOperationsConfig(store.operations);
    for (const date of relevantInventoryDates(store, roomId)) {
      const hasDateInventoryOverride = operations.dateOverrides.some((item) => item.roomId === roomId && item.date === date && item.totalInventory != null);
      if (hasDateInventoryOverride) continue;
      const required = requiredInventory(store, roomId, date);
      if (input.totalInventory < required) {
        throw new Error(`Inventory cannot be reduced below ${required} committed/blocked room(s) on ${date}.`);
      }
    }
    operations.roomSettings[roomId] = { roomId, baseRate: input.baseRate, totalInventory: input.totalInventory };
    operations.updatedAt = new Date().toISOString();
    store.operations = operations;
    return operations.roomSettings[roomId];
  });
}

export async function upsertDateOverride(input: Omit<DateInventoryOverride, "id"> & { id?: string }) {
  if (!operationalRoomIds.includes(input.roomId)) throw new Error("Unknown room category.");
  if (!validIsoDate(input.date)) throw new Error("Enter a valid date.");
  if (input.totalInventory == null && input.baseRate == null) throw new Error("Provide an inventory or rate override.");
  if (input.totalInventory != null && (!Number.isInteger(input.totalInventory) || input.totalInventory < 0 || input.totalInventory > 100)) throw new Error("Invalid inventory override.");
  if (input.baseRate != null && (!Number.isInteger(input.baseRate) || input.baseRate < 0 || input.baseRate > 1_000_000)) throw new Error("Invalid rate override.");
  return withBookingStore((store) => {
    const operations = normalizeOperationsConfig(store.operations);
    const existingIndex = operations.dateOverrides.findIndex((item) => item.roomId === input.roomId && item.date === input.date);
    const existing = existingIndex >= 0 ? operations.dateOverrides[existingIndex] : undefined;
    const nextInventory = input.totalInventory != null ? input.totalInventory : existing?.totalInventory;
    const nextRate = input.baseRate != null ? input.baseRate : existing?.baseRate;
    if (nextInventory == null && nextRate == null) throw new Error("Provide an inventory or rate override.");
    if (nextInventory != null) {
      const required = requiredInventory(store, input.roomId, input.date);
      if (nextInventory < required) throw new Error(`Inventory cannot be set below ${required} committed/blocked room(s) on this date.`);
    }
    const record: DateInventoryOverride = {
      id: input.id || existing?.id || randomUUID(),
      roomId: input.roomId,
      date: input.date,
      ...(nextInventory != null ? { totalInventory: nextInventory } : {}),
      ...(nextRate != null ? { baseRate: nextRate } : {}),
      ...((input.note?.trim() || existing?.note) ? { note: (input.note?.trim() || existing?.note || "").slice(0, 300) } : {}),
    };
    if (existingIndex >= 0) operations.dateOverrides[existingIndex] = record;
    else operations.dateOverrides.push(record);
    operations.updatedAt = new Date().toISOString();
    store.operations = operations;
    return record;
  });
}

export async function removeDateOverride(id: string) {
  return withBookingStore((store) => {
    const operations = normalizeOperationsConfig(store.operations);
    const target = operations.dateOverrides.find((item) => item.id === id);
    if (!target) throw new Error("Override not found.");
    if (target.totalInventory != null) {
      const required = requiredInventory(store, target.roomId, target.date);
      const baseTotal = operations.roomSettings[target.roomId].totalInventory;
      if (baseTotal < required) {
        throw new Error(`This inventory override cannot be removed because ${required} room(s) are already committed/blocked on ${target.date}.`);
      }
    }
    operations.dateOverrides = operations.dateOverrides.filter((item) => item.id !== id);
    operations.updatedAt = new Date().toISOString();
    store.operations = operations;
    return true;
  });
}

export async function createInventoryBlock(input: { roomId: RoomId; date: string; quantity: number; reason?: string }) {
  if (!operationalRoomIds.includes(input.roomId)) throw new Error("Unknown room category.");
  if (!validIsoDate(input.date)) throw new Error("Enter a valid date.");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) throw new Error("Enter a valid blocked-room quantity.");
  return withBookingStore((store) => {
    const total = effectiveRoomTotal(store, input.roomId, input.date);
    const existing = blockedRoomsOnDate(store, input.roomId, input.date);
    const committed = committedRoomsOnDate(store, input.roomId, input.date);
    if (existing + committed + input.quantity > total) throw new Error("This block would reduce inventory below rooms that are already held or confirmed for that date.");
    const block = { id: randomUUID(), roomId: input.roomId, date: input.date, quantity: input.quantity, ...(input.reason?.trim() ? { reason: input.reason.trim().slice(0, 300) } : {}) };
    store.blocks.push(block);
    return block;
  });
}

export async function removeInventoryBlock(id: string) {
  return withBookingStore((store) => {
    const before = store.blocks.length;
    store.blocks = store.blocks.filter((item) => item.id !== id);
    if (store.blocks.length === before) throw new Error("Inventory block not found.");
    return true;
  });
}
