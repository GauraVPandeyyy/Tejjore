import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, loadMigrations } from "../../scripts/lib/migrations.mjs";
import { seedContent } from "../../db/seed/seedContent";

export const migrationsDir = path.resolve(import.meta.dirname, "../../db/migrations");

/** Disposable in-memory PostgreSQL (PGlite). Never connects to DATABASE_URL. */
export async function createTestDatabase({ migrate = true, seed = false }: { migrate?: boolean; seed?: boolean } = {}) {
  const pg = new PGlite();
  const db = {
    exec: (sql: string) => pg.exec(sql),
    query: (text: string, params?: unknown[]) => pg.query(text, params),
  };
  if (migrate) await applyMigrations(db, await loadMigrations(migrationsDir));
  if (seed) await seedContent(db);
  return { pg, db, close: () => pg.close() };
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;
