import path from "node:path";
import { Client } from "pg";
import { pgClientConfig } from "./db-connection.mjs";
import { loadProjectEnv, projectRoot } from "./lib/load-env.mjs";
import { applyMigrations, describeTarget, loadMigrations, migrationStatus } from "./lib/migrations.mjs";

// Usage:
//   npm run db:migrate              apply pending migrations (.env.local is loaded like Next.js)
//   npm run db:migrate -- --status  list applied / pending migrations, change nothing
//   npm run db:migrate -- --check   validate the migration files offline (no database connection)
// Each pending file runs in one transaction with its schema_migrations row; see scripts/lib/migrations.mjs.
// An unrecognised flag must never fall through to "apply": a mistyped `--help` once would have run
// migrations against whatever DATABASE_URL points at.
const flags = process.argv.slice(2).filter((arg) => arg.startsWith("-"));
if (flags.includes("--help") || flags.includes("-h")) {
  console.log("Usage: npm run db:migrate [-- --status | --check]\n  (no flag)  apply pending migrations to DATABASE_URL\n  --status   list applied / pending migrations, change nothing\n  --check    validate the migration files offline, no database connection");
  process.exit(0);
}
const unknownFlags = flags.filter((flag) => flag !== "--check" && flag !== "--status");
if (unknownFlags.length) {
  console.error(`Unknown option ${unknownFlags.join(", ")}. Nothing was run. Use --status, --check or --help.`);
  process.exit(2);
}
const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--status") ? "status" : "apply";
const migrations = await loadMigrations(path.join(projectRoot, "db/migrations"));

if (mode === "check") {
  for (const migration of migrations) console.log(`ok     ${migration.id}  sha256:${migration.checksum.slice(0, 12)}`);
  console.log(`${migrations.length} migration files valid (names, order, no self-managed transactions).`);
  process.exit(0);
}

loadProjectEnv();
const config = pgClientConfig();
const client = new Client(config);
const db = { exec: (sql) => client.query(sql), query: (text, params) => client.query(text, params) };

try {
  await client.connect();
  console.log(`Target database: ${describeTarget(config.connectionString)}`);
  if (mode === "status") {
    for (const item of await migrationStatus(db, migrations)) console.log(`${item.state.padEnd(8)} ${item.id}`);
  } else {
    const applied = await applyMigrations(db, migrations, { log: console.log });
    console.log(applied.length ? `Applied ${applied.length} migration(s).` : "Database already up to date.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
