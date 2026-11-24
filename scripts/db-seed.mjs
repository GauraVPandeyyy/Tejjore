import { Client } from "pg";
import { pgClientConfig } from "./db-connection.mjs";
import { loadProjectEnv } from "./lib/load-env.mjs";
import { describeTarget } from "./lib/migrations.mjs";

// Usage: npm run db:seed   (runs through tsx so it can read the TypeScript content in src/data)
// Inserts missing content rows only (ON CONFLICT DO NOTHING) in one transaction. It never updates
// or deletes anything, and never touches reservations, payments, inventory or booking settings.
// Run `npm run db:migrate` first.
const { seedContent } = await import("../db/seed/seedContent.ts");

loadProjectEnv();
const config = pgClientConfig();
const client = new Client(config);

try {
  await client.connect();
  console.log(`Target database: ${describeTarget(config.connectionString)}`);
  const report = await seedContent({ exec: (sql) => client.query(sql), query: (text, params) => client.query(text, params) });
  for (const row of report) console.log(`${row.table.padEnd(20)} inserted ${String(row.inserted).padStart(3)}  already present ${row.existing}`);
  console.log("Tejjora content seeded. No bookings, payments or inventory were created or changed.");
  console.log("Pages pick up newly seeded content within 10 minutes (content cache), or immediately after a redeploy.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
