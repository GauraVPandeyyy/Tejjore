// Migration engine shared by scripts/db-migrate.mjs, scripts/db-verify.mjs and the tests.
//
// Guarantees:
//   * files are named NNN_name.sql and applied in ascending numeric order (duplicates rejected);
//   * each pending file runs in ONE transaction together with its schema_migrations row, so a
//     migration is recorded only when it fully succeeded and a failure leaves no partial state;
//   * applied migrations are never re-run; an applied file whose content changed stops the run;
//   * a session advisory lock prevents two runners from migrating at the same time.
//
// `db` is a small adapter so the same code drives node-postgres and PGlite:
//   { exec(sql): Promise<unknown>, query(text, params?): Promise<{ rows: object[] }> }
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const MIGRATION_LOCK_KEY = 84322130;
const FILE_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/;

/** Normalise line endings so a CRLF checkout and an LF checkout produce the same checksum. */
const normalise = (sql) => sql.replace(/\r\n/g, "\n");

export const checksumOf = (sql) => createHash("sha256").update(normalise(sql)).digest("hex");

/**
 * Older files (001, 002) wrap themselves in BEGIN; ... COMMIT;. The runner owns the transaction,
 * so a single outer wrapper is removed. Leading comment lines are kept.
 */
export function unwrapTransaction(sql) {
  const text = normalise(sql);
  const match = text.match(/^((?:[ \t]*--[^\n]*\n|[ \t]*\n)*)[ \t]*BEGIN;[ \t]*\n([\s\S]*?)\n[ \t]*COMMIT;\s*$/i);
  if (!match) return text;
  const body = match[2];
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(body)) {
    throw new Error("Nested transaction control inside a migration file is not supported.");
  }
  return `${match[1]}${body}\n`;
}

/** Validates names/order and reads every migration in `dir`. */
export async function loadMigrations(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  const seen = new Map();
  const migrations = [];
  for (const name of names) {
    const match = name.match(FILE_PATTERN);
    if (!match) throw new Error(`Invalid migration file name "${name}" (expected NNN_lower_snake.sql).`);
    if (seen.has(match[1])) throw new Error(`Duplicate migration number ${match[1]}: ${seen.get(match[1])} and ${name}.`);
    seen.set(match[1], name);
    const sql = await readFile(path.join(dir, name), "utf8");
    if (!sql.trim()) throw new Error(`Migration ${name} is empty.`);
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(unwrapTransaction(sql))) {
      throw new Error(`Migration ${name} manages its own transaction; the runner wraps every file.`);
    }
    migrations.push({ id: name, number: Number(match[1]), checksum: checksumOf(sql), body: unwrapTransaction(sql) });
  }
  return migrations;
}

async function ensureLedger(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT;
  `);
}

export async function readLedger(db) {
  const exists = await db.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present");
  if (!exists.rows[0]?.present) return new Map();
  const columns = await db.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'schema_migrations' AND column_name = 'checksum'",
  );
  const result = await db.query(
    columns.rows.length ? "SELECT id, checksum FROM schema_migrations" : "SELECT id, NULL::text AS checksum FROM schema_migrations",
  );
  return new Map(result.rows.map((row) => [row.id, row.checksum ?? null]));
}

/** Pending/applied/drifted status without changing anything (read-only queries). */
export async function migrationStatus(db, migrations) {
  const ledger = await readLedger(db);
  return migrations.map((migration) => {
    if (!ledger.has(migration.id)) return { ...migration, state: "pending" };
    const recorded = ledger.get(migration.id);
    if (recorded && recorded !== migration.checksum) return { ...migration, state: "changed" };
    return { ...migration, state: "applied" };
  });
}

/**
 * Applies pending migrations in order. Returns the ids applied. Throws (after rolling back the
 * failing file) on the first error, leaving every earlier migration committed and recorded.
 */
export async function applyMigrations(db, migrations, { log = () => undefined } = {}) {
  await db.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
  try {
    await ensureLedger(db);
    const status = await migrationStatus(db, migrations);
    const changed = status.filter((item) => item.state === "changed");
    if (changed.length) {
      throw new Error(
        `Applied migration(s) changed after they ran: ${changed.map((item) => item.id).join(", ")}. ` +
          "Never edit an applied migration; add a new NNN_ file instead.",
      );
    }
    // Ledger rows written before checksums existed (Phase 1 runner) adopt the current checksum.
    for (const item of status.filter((entry) => entry.state === "applied")) {
      await db.query("UPDATE schema_migrations SET checksum = $2 WHERE id = $1 AND checksum IS NULL", [item.id, item.checksum]);
    }

    const applied = [];
    for (const migration of status) {
      if (migration.state !== "pending") {
        log(`skip   ${migration.id} (already applied)`);
        continue;
      }
      await db.exec("BEGIN");
      try {
        await db.exec(migration.body);
        await db.query("INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)", [migration.id, migration.checksum]);
        await db.exec("COMMIT");
      } catch (error) {
        await db.exec("ROLLBACK").catch(() => undefined);
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Migration ${migration.id} failed and was rolled back; later migrations were not run. ${reason}`);
      }
      applied.push(migration.id);
      log(`apply  ${migration.id}`);
    }
    return applied;
  } finally {
    await db.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
  }
}

/** Host/database label for logs, without credentials. */
export function describeTarget(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}
