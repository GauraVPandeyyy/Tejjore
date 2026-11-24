import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { isolateEnv } from "./setup/env.mts";
import { createTestDatabase, migrationsDir, type TestDatabase } from "./setup/pglite.mts";

// Phase 2 database tests run against a disposable in-memory PostgreSQL (PGlite).
// DATABASE_URL is blanked: nothing here can reach the live database.
isolateEnv();

const { applyMigrations, loadMigrations, migrationStatus, unwrapTransaction } = await import("../scripts/lib/migrations.mjs");
const { seedContent } = await import("../db/seed/seedContent");
const { getRooms } = await import("../src/lib/content/rooms");
const { getPublicPropertyFacts } = await import("../src/lib/content/facts");
const { getPublishedFaqs } = await import("../src/lib/content/faqs");
const { getPublishedPolicies } = await import("../src/lib/content/policies");
const { getPublishedTestimonials } = await import("../src/lib/content/testimonials");
const { getActiveOffers } = await import("../src/lib/content/offers");
const { getApprovedAiKnowledge } = await import("../src/lib/content/aiKnowledge");
const { getActiveAnnouncements } = await import("../src/lib/content/announcements");
const { getRestaurantMenu, getRestaurantSettings } = await import("../src/lib/content/restaurant");
const { getGalleryImages, getMediaForEntity } = await import("../src/lib/content/media");
const { getReadyTourScenes } = await import("../src/lib/content/tour");
const { getSeoPage } = await import("../src/lib/content/seo");
const { resetContentCircuit } = await import("../src/lib/content/source");
const { commerceConfig } = await import("../src/data/commerce");

const failing = { query: async () => { throw new Error("connection refused"); } };

describe("migration runner", () => {
  test("applies 001–006 in order, records checksums, and a re-run is a no-op", async () => {
    const database = await createTestDatabase({ migrate: false });
    try {
      const migrations = await loadMigrations(migrationsDir);
      assert.deepEqual(migrations.map((item) => item.id), [
        "001_booking_core.sql",
        "002_payment_ledger_and_rate_limits.sql",
        "003_content_core.sql",
        "004_restaurant.sql",
        "005_ops_security.sql",
        "006_drop_last_order_time.sql",
      ]);
      assert.equal((await applyMigrations(database.db, migrations)).length, 6);
      assert.deepEqual(await applyMigrations(database.db, migrations), []);
      // 006: ordering is no longer cut off by a time of day, so the column must be gone.
      const lastOrder = await database.pg.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'last_order_time'");
      assert.equal(lastOrder.rows.length, 0, "restaurant_settings.last_order_time was dropped by 006");
      const ledger = (await database.pg.query<{ id: string; checksum: string }>("SELECT id, checksum FROM schema_migrations ORDER BY id")).rows;
      assert.equal(ledger.length, 6);
      assert.ok(ledger.every((row) => /^[0-9a-f]{64}$/.test(row.checksum)));
      assert.ok((await migrationStatus(database.db, migrations)).every((item) => item.state === "applied"));
    } finally {
      await database.close();
    }
  });

  test("a failing migration rolls back, is not recorded, and later migrations do not run", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "tejjora-migrations-"));
    writeFileSync(path.join(dir, "001_first.sql"), "CREATE TABLE first_ok (id int);");
    writeFileSync(path.join(dir, "002_broken.sql"), "CREATE TABLE half_done (id int);\nSELECT * FROM table_that_does_not_exist;");
    writeFileSync(path.join(dir, "003_later.sql"), "CREATE TABLE never_created (id int);");
    const database = await createTestDatabase({ migrate: false });
    try {
      await assert.rejects(applyMigrations(database.db, await loadMigrations(dir)), /002_broken\.sql failed and was rolled back/);
      const ledger = (await database.pg.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map((row) => row.id);
      assert.deepEqual(ledger, ["001_first.sql"]);
      const tables = (await database.pg.query<{ name: string | null }>(
        "SELECT to_regclass('public.half_done')::text AS name UNION ALL SELECT to_regclass('public.never_created')::text",
      )).rows;
      assert.ok(tables.every((row) => row.name === null), "no partial or later tables");
    } finally {
      await database.close();
    }
  });

  test("an applied migration whose file changed stops the run", async () => {
    const database = await createTestDatabase();
    try {
      await database.pg.query("UPDATE schema_migrations SET checksum = 'deadbeef' WHERE id = '003_content_core.sql'");
      await assert.rejects(applyMigrations(database.db, await loadMigrations(migrationsDir)), /changed after they ran: 003_content_core\.sql/);
    } finally {
      await database.close();
    }
  });

  test("Phase 1 ledger rows without checksums adopt them instead of re-running", async () => {
    const database = await createTestDatabase();
    try {
      await database.pg.query("UPDATE schema_migrations SET checksum = NULL");
      assert.deepEqual(await applyMigrations(database.db, await loadMigrations(migrationsDir)), []);
      const missing = await database.pg.query("SELECT id FROM schema_migrations WHERE checksum IS NULL");
      assert.equal(missing.rows.length, 0);
    } finally {
      await database.close();
    }
  });

  test("file validation: names, duplicates and self-managed transactions", async () => {
    const make = (files: Record<string, string>) => {
      const dir = mkdtempSync(path.join(tmpdir(), "tejjora-migrations-"));
      for (const [name, sql] of Object.entries(files)) writeFileSync(path.join(dir, name), sql);
      return dir;
    };
    await assert.rejects(loadMigrations(make({ "1_bad.sql": "SELECT 1;" })), /Invalid migration file name/);
    await assert.rejects(loadMigrations(make({ "004_a.sql": "SELECT 1;", "004_b.sql": "SELECT 1;" })), /Duplicate migration number 004/);
    await assert.rejects(loadMigrations(make({ "004_a.sql": "SELECT 1;\nCOMMIT;\nSELECT 2;" })), /manages its own transaction/);
    assert.equal(unwrapTransaction("-- note\nBEGIN;\nSELECT 1;\nCOMMIT;\n"), "-- note\nSELECT 1;\n");
    assert.equal(unwrapTransaction("BEGIN;\r\nSELECT 1;\r\nCOMMIT;\r\n"), "SELECT 1;\n");
  });

  test("migrating an existing booking database never changes reservation rows", async () => {
    const database = await createTestDatabase({ migrate: false });
    try {
      const all = await loadMigrations(migrationsDir);
      await applyMigrations(database.db, all.slice(0, 2));
      await database.pg.query(
        `INSERT INTO reservations (id, reference, room_id, check_in, check_out, adults, children, rooms, rate_plan_id, guest, pricing, status, payment_status, created_at, updated_at, payments)
         VALUES ('r1', 'TLV-TEST01', 'premium', '2027-01-10', '2027-01-12', 2, 0, 1, 'room-only', '{"firstName":"Live"}', '{"grandTotal":7000}', 'paid', 'paid', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z', '[{"paymentId":"pay_1","amountPaise":700000}]')`,
      );
      const before = (await database.pg.query("SELECT * FROM reservations")).rows;
      await applyMigrations(database.db, all);
      await seedContent(database.db);
      const after = (await database.pg.query("SELECT * FROM reservations")).rows;
      assert.deepEqual(after, before);
    } finally {
      await database.close();
    }
  });
});

describe("schema constraints (truthfulness and stable ids at the database level)", () => {
  let database: TestDatabase;
  before(async () => { database = await createTestDatabase({ seed: true }); });
  after(async () => { await database.close(); });

  const rejects = (sql: string, pattern: RegExp) => assert.rejects(database.pg.query(sql), pattern);

  test("room ids cannot be renamed in rooms or room_types", async () => {
    await rejects("UPDATE rooms SET id = 'deluxe-room' WHERE id = 'deluxe'", /stable keys|violates/);
    await rejects("UPDATE room_types SET id = 'deluxe-room' WHERE id = 'deluxe'", /stable keys|violates/);
  });

  test("demo reviews can never be published; publishing needs consent", async () => {
    await rejects("INSERT INTO testimonials (id, author_display, text, source, consent, published) VALUES ('d1', 'Demo', 'x', 'demo', true, true)", /testimonials_demo_never_published/);
    await rejects("INSERT INTO testimonials (id, author_display, text, source, consent, published) VALUES ('d2', 'Guest', 'x', 'direct', false, true)", /testimonials_published_needs_consent/);
  });

  test("policies publish only with approval; demo offers never publish; offer windows are ordered", async () => {
    await rejects("UPDATE policies SET published = true WHERE id = 'policy-identification'", /policies_published_needs_approval/);
    await rejects("UPDATE offers SET published = true WHERE id = 'weekend-by-the-lake'", /offers_demo_never_published/);
    await rejects("INSERT INTO offers (slug, title, valid_from, valid_to) VALUES ('bad-window', 'x', '2027-02-01', '2027-01-01')", /offers_window_chk/);
  });

  test("menu half price cannot exceed full; audit log is append-only", async () => {
    await rejects("UPDATE menu_items SET price_half = 999 WHERE id = 'paneer-butter-masala'", /menu_items_half_not_above_full/);
    await database.pg.query("INSERT INTO audit_log (actor, action, entity) VALUES ('test', 'content.update', 'rooms')");
    await rejects("UPDATE audit_log SET actor = 'someone-else'", /append-only/);
  });
});

describe("content seed", () => {
  test("is idempotent and never overwrites later edits", async () => {
    const database = await createTestDatabase();
    try {
      const first = await seedContent(database.db);
      assert.ok(first.find((row) => row.table === "menu_items")?.inserted === 90);
      await database.pg.query("UPDATE rooms SET summary = 'Edited by staff' WHERE id = 'deluxe'");
      const second = await seedContent(database.db);
      assert.equal(second.reduce((sum, row) => sum + row.inserted, 0), 0);
      const summary = (await database.pg.query<{ summary: string }>("SELECT summary FROM rooms WHERE id = 'deluxe'")).rows[0].summary;
      assert.equal(summary, "Edited by staff");
    } finally {
      await database.close();
    }
  });

  test("refuses to run before migrations and contains no destructive SQL", async () => {
    const database = await createTestDatabase({ migrate: false });
    try {
      await assert.rejects(seedContent(database.db), /Run: npm run db:migrate/);
    } finally {
      await database.close();
    }
    const source = readFileSync(path.resolve(import.meta.dirname, "../db/seed/seedContent.ts"), "utf8").replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, "");
    assert.doesNotMatch(source, /\b(UPDATE|DELETE|TRUNCATE|DROP)\b/);
  });
});

describe("content getters against a seeded database", () => {
  let database: TestDatabase;
  const options = () => ({ db: { query: (text: string, params?: unknown[]) => database.pg.query(text, params) } });
  before(async () => {
    database = await createTestDatabase({ seed: true });
    resetContentCircuit();
  });
  after(async () => { await database.close(); });

  test("seeded database renders the same public content as the fallback", async () => {
    const pairs = [
      [await getRooms(options()), await getRooms({ db: failing })],
      [await getPublishedFaqs(options()), await getPublishedFaqs({ db: failing })],
      [await getGalleryImages(options()), await getGalleryImages({ db: failing })],
      [await getRestaurantMenu(options()), await getRestaurantMenu({ db: failing })],
      [await getRestaurantSettings(options()), await getRestaurantSettings({ db: failing })],
      [await getReadyTourScenes(options()), await getReadyTourScenes({ db: failing })],
    ] as const;
    for (const [fromDb, fallback] of pairs) {
      assert.equal(fromDb.source, "database");
      assert.equal(fallback.source, "fallback");
      assert.deepEqual(fromDb.data, fallback.data);
    }
    const facts = await getPublicPropertyFacts(options());
    const fallbackFacts = await getPublicPropertyFacts({ db: failing });
    assert.deepEqual(facts.data.entries, fallbackFacts.data.entries);
  });

  test("rooms keep their stable ids and take the price from the booking configuration", async () => {
    const { data } = await getRooms(options());
    assert.deepEqual(data.map((room) => room.id), ["deluxe", "super-deluxe", "premium"]);
    for (const room of data) assert.equal(room.startingPrice, commerceConfig.roomRates[room.id]);
    assert.ok(data.every((room) => room.sizeSqFt === null && room.bedType === null && room.maxGuests === null && room.view === null));
  });

  test("property facts: only verified + public are returned", async () => {
    await database.pg.query(`INSERT INTO property_facts (key, value, status, source, public) VALUES
      ('test.verified_public', '"yes"', 'verified', 'test', true),
      ('test.verified_private', '"no"', 'verified', 'test', false),
      ('test.provisional_public', '"no"', 'provisional', 'test', true),
      ('test.placeholder_public', '"no"', 'placeholder', 'test', true),
      ('test.conflict_public', '"no"', 'conflict', 'test', true)`);
    const { data } = await getPublicPropertyFacts(options());
    const keys = data.entries.map((entry) => entry.key).filter((key) => key.startsWith("test."));
    assert.deepEqual(keys, ["test.verified_public"]);
    assert.equal(data.get("rooms.inventory"), undefined, "placeholder inventory is never public");
    assert.equal(data.get("stay.check_in_out"), undefined, "conflicting check-in times are never public");
    assert.equal(data.get("positioning.lake_view"), undefined, "unconfirmed lake view is never public");
  });

  test("testimonials: only genuine, consented, published reviews", async () => {
    await database.pg.query(`INSERT INTO testimonials (id, author_display, text, rating, source, source_url, consent, published) VALUES
      ('t-genuine', 'A. Guest', 'Lovely stay.', 5, 'google', 'https://maps.google.com/?cid=1', true, true),
      ('t-hidden', 'B. Guest', 'Not yet approved.', 4, 'direct', NULL, true, false),
      ('t-demo', 'Demo reviewer', 'Demo text.', 5, 'demo', NULL, true, false)`);
    const { data } = await getPublishedTestimonials(options());
    assert.deepEqual(data.map((item) => item.id), ["t-genuine"]);
  });

  test("offers: published + active only (unpublished, expired, future and demo hidden)", async () => {
    await database.pg.query(`INSERT INTO offers (id, slug, title, valid_from, valid_to, published) VALUES
      ('o-active', 'active-offer', 'Active', '2026-10-01', '2026-10-31', true),
      ('o-unpublished', 'unpublished-offer', 'Unpublished', '2026-10-01', '2026-10-31', false),
      ('o-expired', 'expired-offer', 'Expired', '2026-09-01', '2026-09-30', true),
      ('o-future', 'future-offer', 'Future', '2026-11-01', '2026-11-30', true)`);
    const { data } = await getActiveOffers({ ...options(), now: new Date("2026-10-05T06:00:00Z") });
    assert.deepEqual(data.map((offer) => offer.id), ["o-active"]);
  });

  test("AI knowledge: approved + public only", async () => {
    await database.pg.query(`INSERT INTO ai_knowledge (id, topic, question, answer, public, approved) VALUES
      ('k-ok', 'parking', 'Parking?', 'Free private parking.', true, true),
      ('k-unapproved', 'parking', 'Valet?', 'Draft.', true, false),
      ('k-private', 'staff', 'Owner?', 'Private.', false, true)`);
    const { data } = await getApprovedAiKnowledge(null, options());
    assert.deepEqual(data.map((entry) => entry.id), ["k-ok"]);
  });

  test("announcements: published and inside the window", async () => {
    await database.pg.query(`INSERT INTO announcements (id, text, publish_from, publish_until, published) VALUES
      ('a-live', 'Live', '2026-10-01T00:00:00Z', '2026-10-10T00:00:00Z', true),
      ('a-ended', 'Ended', '2026-09-01T00:00:00Z', '2026-09-10T00:00:00Z', true),
      ('a-draft', 'Draft', NULL, NULL, false)`);
    const { data } = await getActiveAnnouncements({ ...options(), now: new Date("2026-10-05T00:00:00Z") });
    assert.deepEqual(data.map((item) => item.id), ["a-live"]);
  });

  test("policies: placeholders stay hidden until approved and published", async () => {
    assert.deepEqual((await getPublishedPolicies(options())).data, []);
    await database.pg.query("UPDATE policies SET approved_by = 'owner', approved_at = NOW(), published = true WHERE id = 'policy-identification'");
    const { data } = await getPublishedPolicies(options());
    assert.deepEqual(data.map((policy) => policy.slug), ["identification"]);
  });

  test("menu integrity in the database", async () => {
    const { data: menu } = await getRestaurantMenu(options());
    const items = menu.flatMap((category) => category.items);
    assert.equal(menu.length, 12);
    assert.equal(items.length, 90);
    assert.equal(items.filter((item) => item.containsEgg).length, 5);
    assert.equal(items.find((item) => item.name === "Paneer Butter Masala")?.priceFull, 280);
    assert.ok(items.every((item) => item.priceHalf === null), "half prices are not printed, so none are set");
    const { data: settings } = await getRestaurantSettings(options());
    assert.equal(settings.prepMinutesMin, 30);
    assert.equal(settings.prepMinutesMax, 40);
    assert.equal(settings.serviceChargePct, 5);
    assert.equal(settings.taxesNote, "Taxes as applicable");
    assert.equal(settings.publicName, null);
    assert.equal(settings.openingTime, null);
    assert.equal(settings.roomDeliveryEnabled, null);
  });

  test("media: one batched query per entity type; provenance travels with each asset", async () => {
    const { data } = await getMediaForEntity("room", "premium", "gallery", options());
    assert.equal(data.length, 6);
    assert.ok(data.every((item) => item.media.provenance === "tejjora"));
    const tour = await getReadyTourScenes(options());
    assert.ok(tour.data.every((scene) => scene.isPropertyMedia === false), "only the labelled demo scene is ready");
    assert.equal((await getSeoPage("/rooms", options())).data, null, "no SEO override → code metadata stays");
  });
});
