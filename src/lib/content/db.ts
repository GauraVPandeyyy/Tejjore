import "server-only";
import path from "node:path";
import { postgresConfigured, queryPostgres } from "@/lib/database/postgres";

/** Minimal query surface; production uses the shared pg pool, tests inject PGlite or a failing stub. */
export type ContentDb = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
};

const productionDb: ContentDb = { query: (text, params) => queryPostgres(text, params) };

const globalForContent = globalThis as typeof globalThis & {
  __tejjoraContentDbOverride?: ContentDb | null;
  __tejjoraQaContentDb?: Promise<ContentDb>;
};

/**
 * Local QA only (never production): `TEJJORA_QA_CONTENT_DB=pglite` runs the content layer and the
 * admin CMS against a disposable in-memory PostgreSQL (PGlite, a dev dependency), migrated and
 * seeded at first use. It lets `next dev` exercise admin saves → public pages without any real
 * database. PGlite is loaded unbundled (`turbopackIgnore`) so it never ships in a build.
 */
function qaContentDb(): ContentDb | null {
  if (process.env.NODE_ENV === "production" || process.env.TEJJORA_QA_CONTENT_DB !== "pglite") return null;
  globalForContent.__tejjoraQaContentDb ??= (async () => {
    const { PGlite } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "@electric-sql/pglite")) as typeof import("@electric-sql/pglite");
    const { applyMigrations, loadMigrations } = await import("../../../scripts/lib/migrations.mjs");
    const { seedContent } = await import("../../../db/seed/seedContent");
    const pg = new PGlite();
    const db = { exec: (sql: string) => pg.exec(sql), query: async (text: string, params?: unknown[]) => (await pg.query(text, params)) as { rows: object[] } };
    await applyMigrations(db, await loadMigrations(path.join(process.cwd(), "db", "migrations")));
    await seedContent(db);
    console.warn("[content] QA in-memory database (PGlite) ready; nothing is persisted.");
    return { query: async (text, params) => (await pg.query(text, params)) as { rows: never[] } };
  })();
  const ready = globalForContent.__tejjoraQaContentDb;
  return { query: async (text, params) => (await ready).query(text, params) };
}

/**
 * The content database for this environment, or null when none is configured (public pages then
 * use the TypeScript fallback and the admin CMS reports that editing needs the database).
 */
export function contentDatabase(): ContentDb | null {
  if (globalForContent.__tejjoraContentDbOverride) return globalForContent.__tejjoraContentDbOverride;
  return qaContentDb() ?? (postgresConfigured() ? productionDb : null);
}

/** Tests only: route content reads and admin writes to the given database (null restores the default). */
export function setContentDatabaseForTests(db: ContentDb | null) {
  globalForContent.__tejjoraContentDbOverride = db;
}
