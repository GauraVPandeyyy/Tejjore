import {
  entityMediaRows,
  faqRows,
  mediaAssetRows,
  menuCategoryRows,
  menuItemRows,
  offerRows,
  policyRows,
  propertyFactRows,
  restaurantSettingsRow,
  roomRows,
  tourHotspotRows,
  tourSceneRows,
} from "@/lib/content/catalog";
import { rooms } from "@/data/rooms";

/**
 * Content seed. INSERT ... ON CONFLICT DO NOTHING only, in one transaction:
 *   - repeatable and idempotent (a second run inserts nothing);
 *   - never updates a row, so staff edits made later in the admin are never overwritten;
 *   - never touches reservations, payments, inventory blocks, booking configuration or orders.
 * Content and statuses come from src/lib/content/catalog.ts (content-ledger statuses).
 */
export type SeedDb = {
  exec(sql: string): Promise<unknown>;
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
};

type Table = { table: string; rows: Array<Record<string, unknown>>; jsonColumns?: string[] };

const REQUIRED_TABLES = ["rooms", "media_assets", "entity_media", "property_facts", "menu_items", "restaurant_settings", "tour_hotspots", "audit_log"];

export function seedTables(): Table[] {
  return [
    { table: "room_types", rows: rooms.map((room) => ({ id: room.id, name: room.name })) },
    { table: "media_assets", rows: mediaAssetRows() },
    { table: "entity_media", rows: entityMediaRows() },
    { table: "rooms", rows: roomRows(), jsonColumns: ["amenities"] },
    { table: "property_facts", rows: propertyFactRows(), jsonColumns: ["value"] },
    { table: "offers", rows: offerRows() },
    { table: "faqs", rows: faqRows() },
    { table: "policies", rows: policyRows() },
    { table: "tour_scenes", rows: tourSceneRows() },
    { table: "tour_hotspots", rows: tourHotspotRows() },
    { table: "menu_categories", rows: menuCategoryRows() },
    { table: "menu_items", rows: menuItemRows(), jsonColumns: ["variants"] },
    { table: "restaurant_settings", rows: [restaurantSettingsRow()] },
  ];
}

export type SeedReport = Array<{ table: string; inserted: number; existing: number }>;

export async function seedContent(db: SeedDb): Promise<SeedReport> {
  const missing: string[] = [];
  for (const table of REQUIRED_TABLES) {
    const result = await db.query("SELECT to_regclass($1) IS NOT NULL AS present", [`public.${table}`]);
    if (!(result.rows[0] as { present?: boolean } | undefined)?.present) missing.push(table);
  }
  if (missing.length) throw new Error(`Content tables are missing (${missing.join(", ")}). Run: npm run db:migrate`);

  const report: SeedReport = [];
  await db.exec("BEGIN");
  try {
    for (const { table, rows, jsonColumns = [] } of seedTables()) {
      let inserted = 0;
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map((column) => (jsonColumns.includes(column) ? JSON.stringify(row[column]) : row[column]));
        const placeholders = columns.map((column, index) => (jsonColumns.includes(column) ? `$${index + 1}::jsonb` : `$${index + 1}`));
        const result = await db.query(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT DO NOTHING RETURNING 1 AS inserted`,
          values,
        );
        inserted += result.rows.length;
      }
      report.push({ table, inserted, existing: rows.length - inserted });
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK").catch(() => undefined);
    throw error;
  }
  return report;
}
