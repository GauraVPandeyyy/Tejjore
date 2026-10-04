import "server-only";
import { Pool, type PoolClient } from "pg";
import type { ReservationRecord } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import type { BookingStoreData, InventoryBlock } from "@/lib/booking/store";
import { normalizeOperationsConfig } from "@/lib/booking/operations";

const globalForPg = globalThis as typeof globalThis & { __tejjoraPgPool?: Pool };

export function postgresConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function pool() {
  if (!postgresConfigured()) throw new Error("DATABASE_URL is not configured.");
  if (!globalForPg.__tejjoraPgPool) {
    globalForPg.__tejjoraPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 8),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForPg.__tejjoraPgPool;
}

type ReservationRow = {
  id: string;
  reference: string;
  room_id: RoomId;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  rate_plan_id: string;
  addon_ids: string[];
  promo_code: string | null;
  guest: ReservationRecord["guest"];
  source: "website";
  pricing: ReservationRecord["pricing"];
  status: ReservationRecord["status"];
  payment_status: ReservationRecord["paymentStatus"];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  payment_order_id: string | null;
  payment_id: string | null;
  staff_notes: string | null;
  access_token_hash: string | null;
  confirmation_email_status: ReservationRecord["confirmationEmailStatus"] | null;
  confirmation_email_sent_at: string | null;
  confirmation_email_error: string | null;
};

function reservationFromRow(row: ReservationRow): ReservationRecord {
  return {
    id: row.id,
    reference: row.reference,
    stay: {
      checkIn: row.check_in,
      checkOut: row.check_out,
      adults: row.adults,
      children: row.children,
      rooms: row.rooms,
    },
    roomId: row.room_id,
    ratePlanId: row.rate_plan_id,
    addonIds: Array.isArray(row.addon_ids) ? row.addon_ids : [],
    ...(row.promo_code ? { promoCode: row.promo_code } : {}),
    guest: row.guest,
    source: row.source,
    pricing: row.pricing,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    ...(row.payment_order_id ? { paymentOrderId: row.payment_order_id } : {}),
    ...(row.payment_id ? { paymentId: row.payment_id } : {}),
    ...(row.staff_notes ? { staffNotes: row.staff_notes } : {}),
    ...(row.access_token_hash ? { accessTokenHash: row.access_token_hash } : {}),
    ...(row.confirmation_email_status ? { confirmationEmailStatus: row.confirmation_email_status } : {}),
    ...(row.confirmation_email_sent_at ? { confirmationEmailSentAt: row.confirmation_email_sent_at } : {}),
    ...(row.confirmation_email_error ? { confirmationEmailError: row.confirmation_email_error } : {}),
  };
}

async function loadStoreWithMeta(client: PoolClient): Promise<{ data: BookingStoreData; operationsStored: boolean }> {
  // Sequential on purpose: a single pg client runs one query at a time anyway.
  const reservationsResult = await client.query<ReservationRow>("SELECT * FROM reservations ORDER BY created_at ASC");
  const blocksResult = await client.query<InventoryBlock>("SELECT id, room_id AS \"roomId\", date, quantity, reason FROM inventory_blocks ORDER BY date ASC, id ASC");
  const webhookResult = await client.query<{ event_id: string }>("SELECT event_id FROM processed_webhooks ORDER BY position ASC");
  const operationsResult = await client.query<{ config: BookingStoreData["operations"] }>("SELECT config FROM booking_operations WHERE id = 1");

  return {
    data: {
      reservations: reservationsResult.rows.map(reservationFromRow),
      blocks: blocksResult.rows,
      processedWebhookIds: webhookResult.rows.map((row: { event_id: string }) => row.event_id),
      operations: normalizeOperationsConfig(operationsResult.rows[0]?.config ?? null),
    },
    operationsStored: operationsResult.rows.length > 0,
  };
}

async function loadStore(client: PoolClient): Promise<BookingStoreData> {
  return (await loadStoreWithMeta(client)).data;
}

type StoreSnapshot = {
  reservations: Map<string, string>;
  blocks: string;
  processedWebhookIds: string;
  operations: string | null;
};

// JSON snapshot of what was loaded, so persistStore writes only what the work changed
// instead of rewriting every row on every booking action.
function snapshotStore(data: BookingStoreData, operationsStored: boolean): StoreSnapshot {
  return {
    reservations: new Map(data.reservations.map((reservation) => [reservation.id, JSON.stringify(reservation)])),
    blocks: JSON.stringify(data.blocks),
    processedWebhookIds: JSON.stringify(data.processedWebhookIds),
    operations: operationsStored ? JSON.stringify(normalizeOperationsConfig(data.operations)) : null,
  };
}

async function saveReservation(client: PoolClient, reservation: ReservationRecord) {
  await client.query(
    `INSERT INTO reservations (
      id, reference, room_id, check_in, check_out, adults, children, rooms,
      rate_plan_id, addon_ids, promo_code, guest, source, pricing, status,
      payment_status, created_at, updated_at, expires_at, payment_order_id,
      payment_id, staff_notes, access_token_hash, confirmation_email_status,
      confirmation_email_sent_at, confirmation_email_error
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13,$14::jsonb,$15,
      $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    )
    ON CONFLICT (id) DO UPDATE SET
      reference=EXCLUDED.reference, room_id=EXCLUDED.room_id,
      check_in=EXCLUDED.check_in, check_out=EXCLUDED.check_out,
      adults=EXCLUDED.adults, children=EXCLUDED.children, rooms=EXCLUDED.rooms,
      rate_plan_id=EXCLUDED.rate_plan_id, addon_ids=EXCLUDED.addon_ids,
      promo_code=EXCLUDED.promo_code, guest=EXCLUDED.guest, source=EXCLUDED.source,
      pricing=EXCLUDED.pricing, status=EXCLUDED.status,
      payment_status=EXCLUDED.payment_status, updated_at=EXCLUDED.updated_at,
      expires_at=EXCLUDED.expires_at, payment_order_id=EXCLUDED.payment_order_id,
      payment_id=EXCLUDED.payment_id, staff_notes=EXCLUDED.staff_notes,
      access_token_hash=EXCLUDED.access_token_hash,
      confirmation_email_status=EXCLUDED.confirmation_email_status,
      confirmation_email_sent_at=EXCLUDED.confirmation_email_sent_at,
      confirmation_email_error=EXCLUDED.confirmation_email_error`,
    [
      reservation.id,
      reservation.reference,
      reservation.roomId,
      reservation.stay.checkIn,
      reservation.stay.checkOut,
      reservation.stay.adults,
      reservation.stay.children,
      reservation.stay.rooms,
      reservation.ratePlanId,
      JSON.stringify(reservation.addonIds),
      reservation.promoCode ?? null,
      JSON.stringify(reservation.guest),
      reservation.source,
      JSON.stringify(reservation.pricing),
      reservation.status,
      reservation.paymentStatus,
      reservation.createdAt,
      reservation.updatedAt,
      reservation.expiresAt,
      reservation.paymentOrderId ?? null,
      reservation.paymentId ?? null,
      reservation.staffNotes ?? null,
      reservation.accessTokenHash ?? null,
      reservation.confirmationEmailStatus ?? null,
      reservation.confirmationEmailSentAt ?? null,
      reservation.confirmationEmailError ?? null,
    ],
  );
}

async function persistStore(client: PoolClient, data: BookingStoreData, before: StoreSnapshot) {
  for (const reservation of data.reservations) {
    if (before.reservations.get(reservation.id) === JSON.stringify(reservation)) continue;
    await saveReservation(client, reservation);
  }

  if (JSON.stringify(data.blocks) !== before.blocks) {
    await client.query("DELETE FROM inventory_blocks");
    for (const block of data.blocks) {
      await client.query(
        "INSERT INTO inventory_blocks (id, room_id, date, quantity, reason) VALUES ($1,$2,$3,$4,$5)",
        [block.id, block.roomId, block.date, block.quantity, block.reason ?? null],
      );
    }
  }

  // Also written when no row exists yet, so the first write still records the configuration.
  const operations = JSON.stringify(normalizeOperationsConfig(data.operations));
  if (operations !== before.operations) {
    await client.query(
      `INSERT INTO booking_operations (id, config, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [operations],
    );
  }

  if (JSON.stringify(data.processedWebhookIds) !== before.processedWebhookIds) {
    await client.query("DELETE FROM processed_webhooks");
    for (const [position, eventId] of data.processedWebhookIds.entries()) {
      await client.query(
        "INSERT INTO processed_webhooks (event_id, position) VALUES ($1,$2) ON CONFLICT (event_id) DO UPDATE SET position = EXCLUDED.position",
        [eventId, position],
      );
    }
  }
}

export async function readPostgresBookingStore() {
  const client = await pool().connect();
  try {
    return await loadStore(client);
  } finally {
    client.release();
  }
}

export async function withPostgresBookingStore<T>(work: (data: BookingStoreData) => Promise<T> | T): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    // Hotel booking writes are low-volume. A single transaction advisory lock prevents
    // two app instances from consuming the same inventory slot concurrently.
    await client.query("SELECT pg_advisory_xact_lock(84322129)");
    const { data, operationsStored } = await loadStoreWithMeta(client);
    const before = snapshotStore(data, operationsStored);
    const result = await work(data);
    await persistStore(client, data, before);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
