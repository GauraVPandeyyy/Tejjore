import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { recordAudit } from "@/lib/admin/audit";
import { maskGuestName } from "@/lib/booking/maskedView";
import type { ContentDb } from "@/lib/content/db";
import { normalizePhoneE164 } from "@/lib/phone";
import {
  ORDER_LIMITS,
  ORDER_REFERENCE,
  lineVariantLabel,
  normalizeOrderReference,
  orderingWindow,
  serviceChargePaise,
  unitPricePaise,
  type OrderLineInput,
  type OrderSize,
} from "./rules";

/** A problem with the guest's order (shown to them), as opposed to a storage failure. */
export class OrderInputError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const money = (paise: number) => (paise / 100).toFixed(2);

export function createOrderReference() {
  let body = "";
  const bytes = new Uint8Array(randomBytes(10) as unknown as ArrayBuffer);
  for (let i = 0; i < bytes.length; i += 1) body += ALPHABET[bytes[i] % 32];
  return `TLO-${body}`;
}

type SettingsRow = {
  ordering_enabled: boolean;
  opening_time: string | null;
  service_charge_pct: number | null;
  room_delivery_enabled: boolean | null;
  prep_minutes_min: number | null;
  prep_minutes_max: number | null;
};

async function liveSettings(db: ContentDb) {
  const row = (
    await db.query<SettingsRow>(
      `SELECT ordering_enabled, to_char(opening_time, 'HH24:MI') AS opening_time,
              service_charge_pct::float8 AS service_charge_pct, room_delivery_enabled, prep_minutes_min, prep_minutes_max
         FROM restaurant_settings WHERE id = 1`,
    )
  ).rows[0];
  return row ?? null;
}

export type PlacedOrder = {
  reference: string;
  status: "requested";
  lines: Array<{ name: string; variant: string | null; qty: number; unitPrice: number }>;
  subtotal: number;
  serviceCharge: number;
  totalExclTax: number;
  prepMinutesMin: number | null;
  prepMinutesMax: number | null;
};

type ItemRow = { id: string; name: string; variants: unknown; price_full: number; price_half: number | null; available: boolean };

const asRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Places a request-to-order. Everything that matters is decided here, never by the browser:
 * the admin ordering switch, item availability, variants, unit prices (from
 * `menu_items`), the service charge and the total. The order and its lines are one INSERT
 * statement, so a failure never leaves a half-written order.
 */
export async function placeOrder(db: ContentDb, raw: unknown, { now = new Date(), request }: { now?: Date; request?: Request } = {}): Promise<PlacedOrder> {
  const body = asRecord(raw);
  if (!body) throw new OrderInputError("INVALID_ORDER", "The order could not be read. Please refresh and try again.");

  const settings = await liveSettings(db);
  if (!settings) throw new OrderInputError("ORDERING_UNAVAILABLE", "Online ordering is not available right now. Please call the hotel to order.", 503);
  const window = orderingWindow({ orderingEnabled: settings.ordering_enabled, openingTime: settings.opening_time }, now);
  if (!window.open) throw new OrderInputError("ORDERING_CLOSED", window.message, 409);

  const guestName = clean(body.guestName, 80);
  if (!guestName) throw new OrderInputError("INVALID_ORDER", "Enter your name so the restaurant knows who the order is for.");
  const phone = normalizePhoneE164(body.phone);
  if (!phone) throw new OrderInputError("INVALID_ORDER", "Enter a valid mobile number. You will need it to check this order.");
  const roomNumber = settings.room_delivery_enabled === false ? "" : clean(body.roomNumber, 10);
  if (roomNumber && !/^[A-Za-z0-9-]{1,10}$/.test(roomNumber)) throw new OrderInputError("INVALID_ORDER", "Room number can only contain letters, numbers and hyphens.");
  const notes = clean(body.notes, ORDER_LIMITS.notes);
  if (body.acknowledged !== true) throw new OrderInputError("ACK_REQUIRED", "Please confirm that an order cannot be cancelled once it is placed.");

  if (!Array.isArray(body.lines) || body.lines.length < 1) throw new OrderInputError("INVALID_ORDER", "Your order is empty. Add at least one dish.");
  if (body.lines.length > ORDER_LIMITS.maxLines) throw new OrderInputError("INVALID_ORDER", `An order can have at most ${ORDER_LIMITS.maxLines} lines.`);
  const merged = new Map<string, OrderLineInput>();
  for (const entry of body.lines) {
    const line = asRecord(entry);
    const qty = Number(line?.qty);
    const itemId = typeof line?.itemId === "string" ? line.itemId : "";
    if (!line || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(itemId) || !Number.isInteger(qty) || qty < 1 || qty > ORDER_LIMITS.maxQty) {
      throw new OrderInputError("INVALID_ORDER", `Each dish needs a quantity from 1 to ${ORDER_LIMITS.maxQty}.`);
    }
    const size: OrderSize | null = line.size === "half" || line.size === "full" ? line.size : null;
    const variant = clean(line.variant, 80) || null;
    const key = `${itemId}|${variant ?? ""}|${size ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.qty += qty;
    else merged.set(key, { itemId, qty, variant, size });
  }

  const ids = [...new Set([...merged.values()].map((line) => line.itemId))];
  const itemRows = (
    await db.query<ItemRow>(
      `SELECT i.id, i.name, i.variants, i.price_full::float8 AS price_full, i.price_half::float8 AS price_half, i.available
         FROM menu_items i JOIN menu_categories c ON c.id = i.category_id
        WHERE i.id = ANY($1::text[]) AND i.published AND c.published`,
      [ids],
    )
  ).rows;
  const items = new Map(itemRows.map((row) => [row.id, row]));

  const unavailable: string[] = [];
  const priced = [...merged.values()].map((line) => {
    const item = items.get(line.itemId);
    if (!item) throw new OrderInputError("ITEM_UNKNOWN", "Part of your order is no longer on the menu. Please refresh the menu and review your cart.", 409);
    if (!item.available) unavailable.push(item.name);
    const variants = Array.isArray(item.variants) ? (item.variants as unknown[]).filter((v): v is string => typeof v === "string") : [];
    if (variants.length && (!line.variant || !variants.includes(line.variant))) throw new OrderInputError("INVALID_ORDER", `Choose an option for ${item.name}.`);
    if (!variants.length && line.variant) throw new OrderInputError("INVALID_ORDER", `${item.name} has no options.`);
    if (line.size === "half" && item.price_half === null) throw new OrderInputError("INVALID_ORDER", `${item.name} is not sold in a half portion.`);
    const pricing = { priceFull: item.price_full, priceHalf: item.price_half };
    return {
      itemId: item.id,
      name: item.name,
      variant: lineVariantLabel(pricing, line.variant, line.size),
      qty: line.qty,
      unitPaise: unitPricePaise(pricing, line.size),
    };
  });
  if (unavailable.length) {
    throw new OrderInputError("ITEM_UNAVAILABLE", `${[...new Set(unavailable)].join(", ")} ${unavailable.length === 1 ? "is" : "are"} not available today. Please remove ${unavailable.length === 1 ? "it" : "them"} and try again.`, 409);
  }

  const subtotalPaise = priced.reduce((sum, line) => sum + line.unitPaise * line.qty, 0);
  const servicePaise = serviceChargePaise(subtotalPaise, settings.service_charge_pct);
  const totalPaise = subtotalPaise + servicePaise;
  if (typeof body.expectedTotal === "number" && Math.round(body.expectedTotal * 100) !== totalPaise) {
    throw new OrderInputError("PRICE_CHANGED", "Prices on the menu have changed. Please review your order and submit again.", 409);
  }

  const history = JSON.stringify([{ status: "requested", at: now.toISOString() }]);
  const lines = JSON.stringify(priced.map((line) => ({ item_id: line.itemId, name_snapshot: line.name, variant: line.variant, qty: line.qty, unit_price: money(line.unitPaise) })));
  let reference = "";
  for (let attempt = 0; attempt < 3 && !reference; attempt += 1) {
    const candidate = createOrderReference();
    try {
      await db.query(
        `WITH o AS (
           INSERT INTO menu_orders (reference, room_number, guest_name, phone_e164, status, subtotal, service_charge, total_excl_tax, notes, status_history)
           VALUES ($1, NULLIF($2, ''), $3, $4, 'requested', $5::numeric, $6::numeric, $7::numeric, NULLIF($8, ''), $9::jsonb)
           RETURNING id
         )
         INSERT INTO menu_order_items (order_id, item_id, name_snapshot, variant, qty, unit_price_snapshot)
         SELECT o.id, v.item_id, v.name_snapshot, v.variant, v.qty, v.unit_price
           FROM o, jsonb_to_recordset($10::jsonb) AS v(item_id text, name_snapshot text, variant text, qty int, unit_price numeric)`,
        [candidate, roomNumber, guestName, phone, money(subtotalPaise), money(servicePaise), money(totalPaise), notes, history, lines],
      );
      reference = candidate;
    } catch (error) {
      if ((error as { code?: string })?.code !== "23505") throw error;
    }
  }
  if (!reference) throw new Error("Could not allocate a unique order reference.");

  await recordAudit("anonymous", { action: "menu_order.placed", entity: "menu_order", entityId: reference, diff: { lines: priced.length, total: totalPaise / 100, roomGiven: Boolean(roomNumber) }, request });
  return {
    reference,
    status: "requested",
    lines: priced.map((line) => ({ name: line.name, variant: line.variant, qty: line.qty, unitPrice: line.unitPaise / 100 })),
    subtotal: subtotalPaise / 100,
    serviceCharge: servicePaise / 100,
    totalExclTax: totalPaise / 100,
    prepMinutesMin: settings.prep_minutes_min,
    prepMinutesMax: settings.prep_minutes_max,
  };
}

export type GuestOrderView = {
  reference: string;
  status: string;
  guestNameMasked: string;
  phoneLast4: string;
  roomNumber: string | null;
  declineReason: string | null;
  lines: Array<{ name: string; variant: string | null; qty: number; unitPrice: number }>;
  subtotal: number;
  serviceCharge: number;
  totalExclTax: number;
  placedAt: string;
  updatedAt: string;
  history: Array<{ status: string; at: string }>;
};

type OrderLookupRow = {
  id: string;
  reference: string;
  status: string;
  guest_name: string;
  phone_e164: string;
  room_number: string | null;
  decline_reason: string | null;
  subtotal: number;
  service_charge: number;
  total_excl_tax: number;
  created_at: string;
  updated_at: string;
  status_history: Array<{ status?: unknown; at?: unknown }>;
};

/** Reference + mobile → the guest's own order, or null. Constant-time phone compare; one generic failure. */
export async function lookupOrder(db: ContentDb, referenceInput: unknown, phoneInput: unknown): Promise<GuestOrderView | null> {
  const reference = normalizeOrderReference(referenceInput);
  const phone = normalizePhoneE164(phoneInput);
  if (!ORDER_REFERENCE.test(reference) || !phone) return null;
  const row = (
    await db.query<OrderLookupRow>(
      `SELECT id, reference, status, guest_name, phone_e164, room_number, decline_reason, subtotal::float8 AS subtotal,
              service_charge::float8 AS service_charge, total_excl_tax::float8 AS total_excl_tax, status_history,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
              to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
         FROM menu_orders WHERE reference = $1`,
      [reference],
    )
  ).rows[0];
  const stored = Buffer.from(row?.phone_e164 ?? "+00000000000", "utf8");
  const supplied = Buffer.from(phone, "utf8");
  if (!row || stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) return null;

  const lines = (
    await db.query<{ name_snapshot: string; variant: string | null; qty: number; unit_price_snapshot: number }>(
      "SELECT name_snapshot, variant, qty, unit_price_snapshot::float8 AS unit_price_snapshot FROM menu_order_items WHERE order_id = $1 ORDER BY created_at, id",
      [row.id],
    )
  ).rows;
  const [first, ...rest] = row.guest_name.trim().split(/\s+/);
  return {
    reference: row.reference,
    status: row.status,
    guestNameMasked: maskGuestName(first ?? "", rest.join(" ")),
    phoneLast4: row.phone_e164.slice(-4),
    roomNumber: row.room_number,
    declineReason: row.decline_reason,
    lines: lines.map((line) => ({ name: line.name_snapshot, variant: line.variant, qty: line.qty, unitPrice: line.unit_price_snapshot })),
    subtotal: row.subtotal,
    serviceCharge: row.service_charge,
    totalExclTax: row.total_excl_tax,
    placedAt: row.created_at,
    updatedAt: row.updated_at,
    history: (Array.isArray(row.status_history) ? row.status_history : []).flatMap((entry) => (typeof entry.status === "string" && typeof entry.at === "string" ? [{ status: entry.status, at: entry.at }] : [])),
  };
}
