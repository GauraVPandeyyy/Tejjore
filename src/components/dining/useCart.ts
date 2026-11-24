"use client";

import { useCallback, useEffect, useState } from "react";
import type { MenuCategory, MenuItem } from "@/lib/content/types";
import { ORDER_LIMITS, lineVariantLabel, serviceChargePaise, unitPricePaise, type OrderSize } from "@/lib/restaurant/rules";

export type CartLine = { key: string; itemId: string; variant: string | null; size: OrderSize | null; qty: number };

const STORAGE_KEY = "tejjora-cart-v1";
const lineKey = (itemId: string, variant: string | null, size: OrderSize | null) => `${itemId}|${variant ?? ""}|${size ?? ""}`;

function read(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as CartLine[];
    return Array.isArray(parsed)
      ? parsed.filter((line) => typeof line?.itemId === "string" && Number.isInteger(line.qty) && line.qty >= 1 && line.qty <= ORDER_LIMITS.maxQty).slice(0, ORDER_LIMITS.maxLines)
      : [];
  } catch {
    return [];
  }
}

/**
 * The guest's cart, stored per browser (localStorage) and reconciled with the live menu: dishes
 * that left the menu or a half portion that no longer exists are dropped, and prices always come
 * from the menu data passed in (the server re-prices again on submit).
 */
export function useCart(menu: MenuCategory[]) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const items = new Map<string, MenuItem>(menu.flatMap((category) => category.items.map((item) => [item.id, item] as const)));

  useEffect(() => {
    // Reading localStorage must wait for the browser (SSR renders an empty cart).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage blocked: the cart still works for this visit */
    }
  }, [lines, ready]);

  const valid = lines.filter((line) => {
    const item = items.get(line.itemId);
    return item && (line.size !== "half" || item.priceHalf !== null);
  });

  const add = useCallback((itemId: string, variant: string | null, size: OrderSize | null) => {
    setLines((current) => {
      const key = lineKey(itemId, variant, size);
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => (line.key === key ? { ...line, qty: Math.min(ORDER_LIMITS.maxQty, line.qty + 1) } : line));
      if (current.length >= ORDER_LIMITS.maxLines) return current;
      return [...current, { key, itemId, variant, size, qty: 1 }];
    });
  }, []);
  const setQty = useCallback((key: string, qty: number) => {
    setLines((current) => (qty < 1 ? current.filter((line) => line.key !== key) : current.map((line) => (line.key === key ? { ...line, qty: Math.min(ORDER_LIMITS.maxQty, qty) } : line))));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const detailed = valid.flatMap((line) => {
    const item = items.get(line.itemId);
    if (!item) return [];
    const unitPaise = unitPricePaise(item, line.size);
    return [{ ...line, item, label: lineVariantLabel(item, line.variant, line.size), unitPaise, totalPaise: unitPaise * line.qty }];
  });
  const count = detailed.reduce((sum, line) => sum + line.qty, 0);
  const subtotalPaise = detailed.reduce((sum, line) => sum + line.totalPaise, 0);
  const inCart = (itemId: string) => detailed.filter((line) => line.itemId === itemId).reduce((sum, line) => sum + line.qty, 0);

  return { lines: detailed, count, subtotalPaise, inCart, add, setQty, clear, serviceFor: (pct: number | null) => serviceChargePaise(subtotalPaise, pct) };
}

export type Cart = ReturnType<typeof useCart>;
