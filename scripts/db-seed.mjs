import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(`
    INSERT INTO room_types (id, name) VALUES
      ('deluxe', 'Deluxe Room'),
      ('super-deluxe', 'Super Deluxe Room'),
      ('premium', 'Premium Room')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  `);
  console.log("Tejjora development reference data seeded. No fake bookings were created.");
} finally {
  await client.end().catch(() => undefined);
}
