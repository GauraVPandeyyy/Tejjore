import { formatClock } from "@/components/dining/diningFormat";
import type { MenuItem, RestaurantSettings } from "@/lib/content/types";

/**
 * Request-to-order rules shared by the cart (to explain) and the server (to enforce). The server
 * always re-prices from the database; the numbers computed here are only the cart's estimate.
 */
export const ORDER_LIMITS = { maxLines: 30, maxQty: 20, notes: 500 } as const;

export type OrderSize = "half" | "full";
export type OrderLineInput = { itemId: string; qty: number; variant?: string | null; size?: OrderSize | null };

export type OrderingWindowSettings = Pick<RestaurantSettings, "orderingEnabled" | "openingTime">;
export type OrderingWindow =
  | { open: true; reason: null; message: null }
  | { open: false; reason: "disabled" | "before_opening"; message: string };

/** Current India (hotel) wall-clock time as "HH:MM". */
export function indiaClock(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

/**
 * Ordering is open from the opening time (when the hotel has confirmed one; otherwise from the
 * start of the day) and only while the admin switch is on. No hours are
 * assumed.
 */
export function orderingWindow(settings: OrderingWindowSettings, now: Date = new Date()): OrderingWindow {
  if (!settings.orderingEnabled) {
    return { open: false, reason: "disabled", message: "Online ordering is not open right now. Please call the hotel to order." };
  }
  const clock = indiaClock(now);
  if (settings.openingTime && clock < settings.openingTime) {
    return { open: false, reason: "before_opening", message: `Online ordering opens at ${formatClock(settings.openingTime)}.` };
  }
  return { open: true, reason: null, message: null };
}

/** Price in paise of one unit; a half portion only exists where the menu prints a half price. */
export function unitPricePaise(item: Pick<MenuItem, "priceFull" | "priceHalf">, size: OrderSize | null | undefined) {
  const rupees = size === "half" && item.priceHalf !== null ? item.priceHalf : item.priceFull;
  return Math.round(rupees * 100);
}

export function serviceChargePaise(subtotalPaise: number, pct: number | null) {
  return pct ? Math.round((subtotalPaise * pct) / 100) : 0;
}

/** "Aloo · Half" – the text stored with the order line and shown to the kitchen. */
export function lineVariantLabel(item: Pick<MenuItem, "priceHalf">, variant: string | null | undefined, size: OrderSize | null | undefined) {
  const parts = [variant?.trim() || null, item.priceHalf !== null && size ? (size === "half" ? "Half" : "Full") : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Order references: `TLO-` + 10 Crockford base32 characters (matches the database CHECK). */
export const ORDER_REFERENCE = /^TLO-[0-9A-Z]{8,12}$/;

export function normalizeOrderReference(input: unknown) {
  if (typeof input !== "string") return "";
  const body = input.trim().toUpperCase().replace(/^TLO[-\s]*/, "").replace(/[-\s]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return `TLO-${body}`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  requested: "Request sent",
  accepted: "Accepted",
  preparing: "Preparing",
  out_for_delivery: "On its way",
  ready: "Ready",
  delivered: "Delivered",
  declined: "Declined",
  cancelled_by_staff: "Cancelled by the restaurant",
};
