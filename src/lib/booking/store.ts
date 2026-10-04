import "server-only";
import { mkdir, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReservationRecord } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import type { HotelOperationsConfig } from "@/types/admin";
import { normalizeOperationsConfig } from "./operations";
import { postgresConfigured, readPostgresBookingStore, withPostgresBookingStore } from "@/lib/database/postgres";

export type InventoryBlock = {
  id: string;
  roomId: RoomId;
  date: string;
  quantity: number;
  reason?: string;
};

export type BookingStoreData = {
  reservations: ReservationRecord[];
  blocks: InventoryBlock[];
  processedWebhookIds: string[];
  operations?: HotelOperationsConfig;
};

const defaultData: BookingStoreData = { reservations: [], blocks: [], processedWebhookIds: [] };
let queue = Promise.resolve();

function storePath() {
  return process.env.BOOKING_STORE_PATH || path.join(process.cwd(), ".data", "tejjora-booking-store.json");
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

async function readStore(): Promise<BookingStoreData> {
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<BookingStoreData>;
    return {
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      processedWebhookIds: Array.isArray(parsed.processedWebhookIds) ? parsed.processedWebhookIds : [],
      operations: normalizeOperationsConfig(parsed.operations),
    };
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return { ...structuredClone(defaultData), operations: normalizeOperationsConfig(null) };
    }
    throw new Error(`Booking store could not be read safely: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

async function writeStore(data: BookingStoreData) {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temp, target);
}

async function sleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function acquireStoreLock() {
  const lockPath = `${storePath()}.lock`;
  const started = Date.now();
  const maxWaitMs = 5000;
  const staleMs = 15000;

  while (Date.now() - started < maxWaitMs) {
    try {
      await mkdir(lockPath, { mode: 0o700 });
      // Keep the lock fresh while work runs so a slow operation is never mistaken for stale.
      const heartbeat = setInterval(() => {
        const now = new Date();
        utimes(lockPath, now, now).catch(() => undefined);
      }, staleMs / 3);
      return async () => {
        clearInterval(heartbeat);
        await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      try {
        const lockStat = await stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > staleMs) {
          await rm(lockPath, { recursive: true, force: true });
          continue;
        }
      } catch (statError) {
        if (errorCode(statError) !== "ENOENT") throw statError;
      }
      await sleep(35);
    }
  }
  throw new Error("Booking store is busy. Please try again in a moment.");
}

async function withFileBookingStore<T>(work: (data: BookingStoreData) => Promise<T> | T): Promise<T> {
  let result!: T;
  let error: unknown;
  const task = async () => {
    const release = await acquireStoreLock();
    try {
      const data = await readStore();
      result = await work(data);
      await writeStore(data);
    } catch (caught) {
      error = caught;
    } finally {
      await release().catch(() => undefined);
    }
  };
  queue = queue.then(task, task);
  await queue;
  if (error) throw error;
  return result;
}

export async function withBookingStore<T>(work: (data: BookingStoreData) => Promise<T> | T): Promise<T> {
  if (postgresConfigured()) return withPostgresBookingStore(work);
  if (process.env.BOOKING_MODE === "production") {
    throw new Error("Production booking persistence requires DATABASE_URL. JSON storage is development-only.");
  }
  return withFileBookingStore(work);
}

export async function readBookingStore() {
  if (postgresConfigured()) return readPostgresBookingStore();
  if (process.env.BOOKING_MODE === "production") {
    throw new Error("Production booking persistence requires DATABASE_URL. JSON storage is development-only.");
  }
  return readStore();
}
