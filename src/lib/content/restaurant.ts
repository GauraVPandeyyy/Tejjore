import "server-only";
import { menuCategoryRows, menuItemRows, restaurantSettingsRow } from "./catalog";
import type { MenuCategoryRow, MenuItemRow, RestaurantSettingsRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, MenuCategory, MenuItem, RestaurantSettings } from "./types";
import { bool, mapRows, number, optionalBool, optionalNumber, optionalText, stringArray, text } from "./validate";

function mapItem(row: MenuItemRow): MenuItem {
  const priceFull = number(row, "price_full", 0, 1_000_000);
  const priceHalf = optionalNumber(row, "price_half", 0, priceFull);
  return {
    id: text(row, "id", 120),
    categoryId: text(row, "category_id", 120),
    name: text(row, "name", 120),
    sourceName: optionalText(row, "source_name", 160),
    description: optionalText(row, "description", 600),
    portion: optionalText(row, "portion", 60),
    variants: stringArray(row, "variants", 20),
    priceFull,
    priceHalf,
    containsEgg: bool(row, "contains_egg"),
    available: bool(row, "available"),
    signature: bool(row, "signature"),
  };
}

/** Published categories with their published items (unavailable items stay, flagged for the UI). */
function toMenu(categories: MenuCategoryRow[], items: MenuItemRow[]): MenuCategory[] {
  const itemsByCategory = new Map<string, MenuItem[]>();
  const orderedItems = [...items].filter((item) => item.published === true).sort((a, b) => a.sort_order - b.sort_order);
  for (const item of mapRows("menu_items", orderedItems, mapItem)) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }
  return mapRows(
    "menu_categories",
    [...categories].filter((category) => category.published === true).sort((a, b) => a.sort_order - b.sort_order),
    (row) => ({
      id: text(row, "id", 120),
      slug: text(row, "slug", 120),
      name: text(row, "name", 80),
      note: optionalText(row, "note", 300),
      items: itemsByCategory.get(row.id) ?? [],
    }),
  ).filter((category) => category.items.length > 0);
}

/** The public room menu: two queries (categories, items), never one query per category. */
export async function getRestaurantMenu(options?: ReadOptions): Promise<ContentResult<MenuCategory[]>> {
  return readContent(
    {
      domain: "menu",
      key: "menu:published",
      load: async (db) => {
        const categories = (await db.query<MenuCategoryRow>("SELECT id, name, slug, sort_order, note, published FROM menu_categories ORDER BY sort_order, id")).rows;
        if (!categories.length) return null;
        const items = (
          await db.query<MenuItemRow>(
            `SELECT id, category_id, name, source_name, description, portion, variants, price_full, price_half,
                    contains_egg, available, signature, sort_order, published, review_note
               FROM menu_items WHERE published ORDER BY category_id, sort_order, id`,
          )
        ).rows;
        return toMenu(categories, items);
      },
      fallback: () => toMenu(menuCategoryRows(), menuItemRows()),
    },
    options,
  );
}

function mapSettings(row: RestaurantSettingsRow): RestaurantSettings {
  return {
    publicName: optionalText(row, "public_name", 120),
    openingTime: optionalText(row, "opening_time", 5),
    prepMinutesMin: optionalNumber(row, "prep_minutes_min", 0, 240),
    prepMinutesMax: optionalNumber(row, "prep_minutes_max", 0, 240),
    serviceChargePct: optionalNumber(row, "service_charge_pct", 0, 30),
    taxesNote: optionalText(row, "taxes_note"),
    allergyNote: optionalText(row, "allergy_note"),
    noCancelNote: optionalText(row, "no_cancel_note"),
    priceChangeNote: optionalText(row, "price_change_note"),
    serviceChargeNote: optionalText(row, "service_charge_note"),
    orderingEnabled: bool(row, "ordering_enabled"),
    roomDeliveryEnabled: optionalBool(row, "room_delivery_enabled"),
  };
}

export async function getRestaurantSettings(options?: ReadOptions): Promise<ContentResult<RestaurantSettings>> {
  const fallback = () => mapSettings(restaurantSettingsRow());
  return readContent(
    {
      domain: "restaurant",
      key: "restaurant:settings",
      load: async (db) => {
        const rows = (
          await db.query<RestaurantSettingsRow>(
            `SELECT id, public_name, to_char(opening_time, 'HH24:MI') AS opening_time,
                    prep_minutes_min, prep_minutes_max, service_charge_pct, taxes_note, allergy_note, no_cancel_note,
                    price_change_note, service_charge_note, ordering_enabled, room_delivery_enabled
               FROM restaurant_settings WHERE id = 1`,
          )
        ).rows;
        return mapRows("restaurant_settings", rows, mapSettings)[0] ?? null;
      },
      fallback,
    },
    options,
  );
}
