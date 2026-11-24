// Usage: npm run db:verify
// Proves the migrations and the content seed against a throwaway in-memory PostgreSQL (PGlite,
// dev dependency). Never reads DATABASE_URL and never connects to any real database.
//   1. applies db/migrations in order, then re-runs them (must be a no-op);
//   2. seeds content twice (second run must insert nothing);
//   3. prints the menu integrity figures and table counts.
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { projectRoot } from "./lib/load-env.mjs";
import { applyMigrations, loadMigrations } from "./lib/migrations.mjs";

const { seedContent } = await import("../db/seed/seedContent.ts");
const pg = new PGlite();
const db = { exec: (sql) => pg.exec(sql), query: (text, params) => pg.query(text, params) };
const failures = [];
const expect = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures.push(`${label}: expected ${expected}, got ${actual}`);
  console.log(`${ok ? "ok  " : "FAIL"} ${label} = ${actual}`);
};

try {
  const migrations = await loadMigrations(path.join(projectRoot, "db/migrations"));
  console.log(`Migrations applied: ${(await applyMigrations(db, migrations)).join(", ")}`);
  expect("Re-run applies nothing", (await applyMigrations(db, migrations)).length, 0);

  const first = await seedContent(db);
  const second = await seedContent(db);
  for (const row of first) console.log(`seed ${row.table.padEnd(20)} inserted ${row.inserted}`);
  expect("Second seed inserts nothing", second.reduce((sum, row) => sum + row.inserted, 0), 0);

  const one = async (sql) => Object.values((await pg.query(sql)).rows[0])[0];
  expect("Menu categories", Number(await one("SELECT count(*) FROM menu_categories")), 12);
  expect("Menu items", Number(await one("SELECT count(*) FROM menu_items")), 90);
  expect("Egg items", Number(await one("SELECT count(*) FROM menu_items WHERE contains_egg")), 5);
  expect("Paneer Butter Masala price", Number(await one("SELECT price_full FROM menu_items WHERE name = 'Paneer Butter Masala'")), 280);
  expect("Prep minutes", await one("SELECT prep_minutes_min || '-' || prep_minutes_max FROM restaurant_settings"), "30-40");
  expect("Service charge %", Number(await one("SELECT service_charge_pct FROM restaurant_settings")), 5);
  expect("Room ids", await one("SELECT string_agg(id, ',' ORDER BY sort_order) FROM rooms"), "deluxe,super-deluxe,premium");
  expect("Published demo offers", Number(await one("SELECT count(*) FROM offers WHERE published")), 0);
  expect("Published policies", Number(await one("SELECT count(*) FROM policies WHERE published")), 0);
  expect("Testimonials seeded", Number(await one("SELECT count(*) FROM testimonials")), 0);
  expect("Reservations created by seed", Number(await one("SELECT count(*) FROM reservations")), 0);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
  console.error(error);
} finally {
  await pg.close();
}

console.log(failures.length ? `\nDB verification FAILED (${failures.length})` : "\nDB verification passed (in-memory PostgreSQL; no real database touched).");
process.exit(failures.length ? 1 : 0);
