import "server-only";
import { commerceConfig } from "@/data/commerce";
import type { HotelOperationsConfig } from "@/types/admin";
import type { RoomId } from "@/types/hotel";
import type { BookingStoreData } from "./store";
import { validIsoDate } from "./validation";

export const operationalRoomIds: RoomId[] = ["deluxe", "super-deluxe", "premium"];

function environmentInventory(roomId: RoomId) {
  const envKey = `INVENTORY_${roomId.replace(/-/g, "_").toUpperCase()}`;
  const raw = process.env[envKey];
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  if (process.env.BOOKING_MODE === "production") return 0;
  return commerceConfig.developmentInventory[roomId];
}

export function defaultOperationsConfig(): HotelOperationsConfig {
  const roomSettings = Object.fromEntries(operationalRoomIds.map((roomId) => [roomId, {
    roomId,
    baseRate: commerceConfig.roomRates[roomId],
    totalInventory: environmentInventory(roomId),
  }])) as HotelOperationsConfig["roomSettings"];
  return { roomSettings, dateOverrides: [], updatedAt: null };
}

export function normalizeOperationsConfig(value?: Partial<HotelOperationsConfig> | null): HotelOperationsConfig {
  const defaults = defaultOperationsConfig();
  const roomSettings = { ...defaults.roomSettings };
  for (const roomId of operationalRoomIds) {
    const incoming = value?.roomSettings?.[roomId];
    if (!incoming) continue;
    roomSettings[roomId] = {
      roomId,
      baseRate: Number.isFinite(incoming.baseRate) && incoming.baseRate >= 0 ? Math.round(incoming.baseRate) : defaults.roomSettings[roomId].baseRate,
      totalInventory: Number.isInteger(incoming.totalInventory) && incoming.totalInventory >= 0 ? incoming.totalInventory : defaults.roomSettings[roomId].totalInventory,
    };
  }
  const dateOverrides = Array.isArray(value?.dateOverrides)
    ? value!.dateOverrides!.filter((item) => operationalRoomIds.includes(item.roomId) && validIsoDate(item.date))
    : [];
  return { roomSettings, dateOverrides, updatedAt: value?.updatedAt ?? null };
}

export function effectiveRoomTotal(store: BookingStoreData, roomId: RoomId, date: string) {
  const config = normalizeOperationsConfig(store.operations);
  const override = config.dateOverrides.find((item) => item.roomId === roomId && item.date === date && item.totalInventory != null);
  return override?.totalInventory ?? config.roomSettings[roomId].totalInventory;
}

export function effectiveRoomRate(store: BookingStoreData, roomId: RoomId, date: string) {
  const config = normalizeOperationsConfig(store.operations);
  const override = config.dateOverrides.find((item) => item.roomId === roomId && item.date === date && item.baseRate != null);
  return override?.baseRate ?? config.roomSettings[roomId].baseRate;
}

export function stayNightlyRates(store: BookingStoreData, roomId: RoomId, checkIn: string, checkOut: string) {
  const result: Array<{ date: string; rate: number }> = [];
  const cursor = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  while (cursor < end) {
    const date = cursor.toISOString().slice(0, 10);
    result.push({ date, rate: effectiveRoomRate(store, roomId, date) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}
