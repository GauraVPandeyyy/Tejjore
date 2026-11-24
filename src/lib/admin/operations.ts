import "server-only";
import { randomUUID } from "node:crypto";
import type {
  AdminInventoryView,
  AdminOverview,
  AdminPage,
  AdminPaymentsView,
  AdminReservationDetail,
  AdminReservationPatch,
  AdminReservationSummary,
  DateInventoryOverride,
} from "@/types/admin";
import type { ReservationRecord, ReservationStatus } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { effectiveRoomRate, effectiveRoomTotal, normalizeOperationsConfig, operationalRoomIds } from "@/lib/booking/operations";
import { availableRoomsOnDate, blockedRoomsOnDate, committedRoomsOnDate } from "@/lib/booking/capacity";
import { validIsoDate } from "@/lib/booking/validation";
import { readBookingStore, withBookingStore } from "@/lib/booking/store";

/** A rule violation staff can act on; its message is safe to show in the admin UI. */
export class AdminInputError extends Error {}

/** List-view projection: only what the dashboard lists need, no contact details or tokens. */
export function toAdminReservationSummary(reservation: ReservationRecord): AdminReservationSummary {
  const digits = reservation.guest.phone.replace(/\D/g, "");
  return {
    reference: reservation.reference,
    guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
    phoneLast4: digits.slice(-4),
    roomId: reservation.roomId,
    stay: reservation.stay,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    pricing: {
      grandTotal: reservation.pricing.grandTotal,
      amountPaid: reservation.pricing.amountPaid,
      amountDue: reservation.pricing.amountDue,
    },
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

/** Detail-view projection for one reservation: full staff record minus access-token hashes. */
export function toAdminReservationDetail(reservation: ReservationRecord): AdminReservationDetail {
  const { accessTokenHash: _accessTokenHash, ...detail } = reservation;
  void _accessTokenHash;
  return detail;
}

export async function getAdminReservationDetail(reference: string) {
  const store = await readBookingStore();
  const reservation = store.reservations.find((item) => item.reference === reference.trim().toUpperCase());
  return reservation ? toAdminReservationDetail(reservation) : null;
}

function matchesQuery(item: ReservationRecord, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  const text = `${item.reference} ${item.guest.firstName} ${item.guest.lastName} ${item.guest.email}`.toLowerCase();
  return text.includes(needle) || (digits.length >= 3 && item.guest.phone.replace(/\D/g, "").includes(digits));
}

function paginate<T>(items: T[], page: number, pageSize: number): AdminPage<T> {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
}

/**
 * Paginated reservation list. Search matches reference, name, email and phone on the server, but
 * every item is a masked summary (no email, full phone or token hash). The booking store is still
 * read whole (existing store contract; targeted SQL is Phase 6), but only one page is returned.
 */
export async function listAdminReservations(input: { page: number; pageSize: number; status?: string | null; query?: string | null }) {
  const store = await readBookingStore();
  const items = store.reservations
    .filter((item) => (!input.status || item.status === input.status) && matchesQuery(item, input.query ?? ""))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toAdminReservationSummary);
  return paginate(items, input.page, input.pageSize);
}

/** Payment view: totals plus a page of the most recently updated reservations. */
export async function getAdminPayments(page: number, pageSize: number): Promise<AdminPaymentsView> {
  const store = await readBookingStore();
  const all = store.reservations;
  const paid = all.filter((item) => item.paymentStatus === "paid");
  return {
    metrics: {
      paid: paid.length,
      pending: all.filter((item) => item.paymentStatus === "pending" || item.paymentStatus === "not_started").length,
      failed: all.filter((item) => item.paymentStatus === "failed").length,
      amountPaid: paid.reduce((sum, item) => sum + item.pricing.amountPaid, 0),
      outstanding: all.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + item.pricing.amountDue, 0),
    },
    records: paginate([...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(toAdminReservationSummary), page, pageSize),
  };
}

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

/** Today view. `includeLists` adds today's arrival/departure summaries (reservations.view). */
export async function getAdminOverview({ includeLists }: { includeLists: boolean }): Promise<AdminOverview> {
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
  return {
    generatedAt: new Date().toISOString(),
    today,
    metrics: {
      arrivals, departures, inHouse, pendingPayments, paymentReviews, confirmedToday, occupiedRooms, totalRooms,
      occupancyPercent: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    },
    ...(includeLists
      ? {
          arrivals: activeConfirmed.filter((item) => item.stay.checkIn === today).map(toAdminReservationSummary),
          departures: activeConfirmed.filter((item) => item.stay.checkOut === today).map(toAdminReservationSummary),
        }
      : {}),
  };
}

export const INVENTORY_GRID_DAYS = 14;

/** Availability & Rates: the 14-day grid, every block and every date override (all manageable). */
export async function getAdminInventory(): Promise<AdminInventoryView> {
  const store = await readBookingStore();
  const inventory: AdminInventoryView["inventory"] = [];
  for (let offset = 0; offset < INVENTORY_GRID_DAYS; offset += 1) {
    const date = indiaDate(offset);
    for (const roomId of operationalRoomIds) {
      const counts = countsForDate(store, roomId, date);
      inventory.push({ date, roomId, ...counts, baseRate: effectiveRoomRate(store, roomId, date) });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    today: indiaDate(),
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
    if (!reservation) throw new AdminInputError("Reservation not found.");
    const previous = { status: reservation.status, staffNotes: reservation.staffNotes ?? "" };
    if (typeof patch.staffNotes === "string") reservation.staffNotes = patch.staffNotes.slice(0, 2000);
    if (patch.status) {
      if (!allowedStatuses.has(patch.status)) throw new AdminInputError("Unsupported reservation status.");
      if (patch.status === "confirmed" && reservation.paymentStatus !== "paid" && process.env.ADMIN_ALLOW_MANUAL_CONFIRM !== "true") {
        throw new AdminInputError("A reservation can only be manually confirmed without verified payment when ADMIN_ALLOW_MANUAL_CONFIRM=true.");
      }
      if (patch.status === "confirmed" && reservation.status !== "confirmed") {
        for (const date of stayDates(reservation.stay.checkIn, reservation.stay.checkOut)) {
          const capacity = availableRoomsOnDate(store, reservation.roomId, date, { excludeReference: reservation.reference });
          if (capacity.available < reservation.stay.rooms) {
            throw new AdminInputError(`This reservation cannot be confirmed because the category no longer has enough inventory on ${date}.`);
          }
        }
      }
      if (patch.status === "completed" && reservation.status !== "confirmed") throw new AdminInputError("Only a confirmed reservation can be completed.");
      reservation.status = patch.status;
      if (patch.status === "cancelled" || patch.status === "completed" || patch.status === "confirmed") reservation.expiresAt = null;
    }
    reservation.updatedAt = new Date().toISOString();
    return { reservation, previous };
  });
}

export async function updateRoomSetting(roomId: RoomId, input: { baseRate: number; totalInventory: number }) {
  if (!operationalRoomIds.includes(roomId)) throw new AdminInputError("Unknown room category.");
  if (!Number.isInteger(input.baseRate) || input.baseRate < 0 || input.baseRate > 1_000_000) throw new AdminInputError("Enter a valid base rate.");
  if (!Number.isInteger(input.totalInventory) || input.totalInventory < 0 || input.totalInventory > 100) throw new AdminInputError("Enter a valid inventory count.");
  return withBookingStore((store) => {
    const operations = normalizeOperationsConfig(store.operations);
    for (const date of relevantInventoryDates(store, roomId)) {
      const hasDateInventoryOverride = operations.dateOverrides.some((item) => item.roomId === roomId && item.date === date && item.totalInventory != null);
      if (hasDateInventoryOverride) continue;
      const required = requiredInventory(store, roomId, date);
      if (input.totalInventory < required) {
        throw new AdminInputError(`Inventory cannot be reduced below ${required} committed/blocked room(s) on ${date}.`);
      }
    }
    const previous = { ...operations.roomSettings[roomId] };
    operations.roomSettings[roomId] = { roomId, baseRate: input.baseRate, totalInventory: input.totalInventory };
    operations.updatedAt = new Date().toISOString();
    store.operations = operations;
    return { setting: operations.roomSettings[roomId], previous };
  });
}

export async function upsertDateOverride(input: Omit<DateInventoryOverride, "id"> & { id?: string }) {
  if (!operationalRoomIds.includes(input.roomId)) throw new AdminInputError("Unknown room category.");
  if (!validIsoDate(input.date)) throw new AdminInputError("Enter a valid date.");
  if (input.totalInventory == null && input.baseRate == null) throw new AdminInputError("Provide an inventory or rate override.");
  if (input.totalInventory != null && (!Number.isInteger(input.totalInventory) || input.totalInventory < 0 || input.totalInventory > 100)) throw new AdminInputError("Invalid inventory override.");
  if (input.baseRate != null && (!Number.isInteger(input.baseRate) || input.baseRate < 0 || input.baseRate > 1_000_000)) throw new AdminInputError("Invalid rate override.");
  return withBookingStore((store) => {
    const operations = normalizeOperationsConfig(store.operations);
    const existingIndex = operations.dateOverrides.findIndex((item) => item.roomId === input.roomId && item.date === input.date);
    const existing = existingIndex >= 0 ? operations.dateOverrides[existingIndex] : undefined;
    const nextInventory = input.totalInventory != null ? input.totalInventory : existing?.totalInventory;
    const nextRate = input.baseRate != null ? input.baseRate : existing?.baseRate;
    if (nextInventory == null && nextRate == null) throw new AdminInputError("Provide an inventory or rate override.");
    if (nextInventory != null) {
      const required = requiredInventory(store, input.roomId, input.date);
      if (nextInventory < required) throw new AdminInputError(`Inventory cannot be set below ${required} committed/blocked room(s) on this date.`);
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
    return { record, previous: existing ? { ...existing } : null };
  });
}

export async function removeDateOverride(id: string) {
  return withBookingStore((store) => {
    const operations = normalizeOperationsConfig(store.operations);
    const target = operations.dateOverrides.find((item) => item.id === id);
    if (!target) throw new AdminInputError("Override not found.");
    if (target.totalInventory != null) {
      const required = requiredInventory(store, target.roomId, target.date);
      const baseTotal = operations.roomSettings[target.roomId].totalInventory;
      if (baseTotal < required) {
        throw new AdminInputError(`This inventory override cannot be removed because ${required} room(s) are already committed/blocked on ${target.date}.`);
      }
    }
    operations.dateOverrides = operations.dateOverrides.filter((item) => item.id !== id);
    operations.updatedAt = new Date().toISOString();
    store.operations = operations;
    return target;
  });
}

export async function createInventoryBlock(input: { roomId: RoomId; date: string; quantity: number; reason?: string }) {
  if (!operationalRoomIds.includes(input.roomId)) throw new AdminInputError("Unknown room category.");
  if (!validIsoDate(input.date)) throw new AdminInputError("Enter a valid date.");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) throw new AdminInputError("Enter a valid blocked-room quantity.");
  return withBookingStore((store) => {
    const total = effectiveRoomTotal(store, input.roomId, input.date);
    const existing = blockedRoomsOnDate(store, input.roomId, input.date);
    const committed = committedRoomsOnDate(store, input.roomId, input.date);
    if (existing + committed + input.quantity > total) throw new AdminInputError("This block would reduce inventory below rooms that are already held or confirmed for that date.");
    const block = { id: randomUUID(), roomId: input.roomId, date: input.date, quantity: input.quantity, ...(input.reason?.trim() ? { reason: input.reason.trim().slice(0, 300) } : {}) };
    store.blocks.push(block);
    return block;
  });
}

export async function removeInventoryBlock(id: string) {
  return withBookingStore((store) => {
    const target = store.blocks.find((item) => item.id === id);
    if (!target) throw new AdminInputError("Inventory block not found.");
    store.blocks = store.blocks.filter((item) => item.id !== id);
    return target;
  });
}
