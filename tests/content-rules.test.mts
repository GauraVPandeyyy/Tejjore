import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { isolateEnv } from "./setup/env.mts";

isolateEnv();

const rules = await import("../src/lib/content/rules");
const { publicTestimonials } = await import("../src/lib/content/testimonials");
const { usableKnowledge } = await import("../src/lib/content/aiKnowledge");
const { ROOM_IDS } = await import("../src/lib/content/rooms");
const catalog = await import("../src/lib/content/catalog");
const { restaurantMenu, restaurantMenuSettings } = await import("../src/data/menu");
const { rooms } = await import("../src/data/rooms");
const { commerceConfig } = await import("../src/data/commerce");
const { getPublicPropertyFacts } = await import("../src/lib/content/facts");
const { hotelSchema, faqSchema, presentSchemas } = await import("../src/lib/seo/schema");
const { StructuredData } = await import("../src/components/seo/StructuredData");

const root = path.resolve(import.meta.dirname, "..");

describe("publication rules", () => {
  test("property facts: verified + public only", () => {
    const cases = [
      { status: "verified", public: true, expected: true },
      { status: "verified", public: false, expected: false },
      { status: "provisional", public: true, expected: false },
      { status: "placeholder", public: true, expected: false },
      { status: "conflict", public: true, expected: false },
    ] as const;
    for (const item of cases) assert.equal(rules.isPublicFact(item), item.expected, `${item.status}/${item.public}`);
  });

  test("testimonials: published genuine → shown; unpublished hidden; demo never shown as genuine", () => {
    const base = { author_display: "A. Guest", text: "Lovely.", rating: 5, source_url: "https://maps.google.com/?cid=1", review_date: null, consent: true, sort_order: 0 };
    const rows = [
      { ...base, id: "genuine", source: "google", published: true },
      { ...base, id: "unpublished", source: "direct", published: false },
      // Even a malformed row that claims to be a published demo review is filtered out.
      { ...base, id: "demo", source: "demo", published: true },
      { ...base, id: "no-consent", source: "direct", consent: false, published: true },
      { ...base, id: "google-no-link", source: "google", source_url: null, published: true },
    ];
    assert.deepEqual(publicTestimonials(rows).map((item) => item.id), ["genuine"]);
  });

  test("offers: published + active only; unpublished, expired, future and demo hidden", () => {
    const now = new Date("2026-10-05T20:00:00Z"); // 2026-10-06 01:30 in India
    const offer = (patch: object) => ({ published: true, isDemo: false, validFrom: null, validTo: null, ...patch });
    assert.equal(rules.isActiveOffer(offer({ validFrom: "2026-10-01", validTo: "2026-10-31" }), now), true);
    assert.equal(rules.isActiveOffer(offer({ published: false }), now), false);
    assert.equal(rules.isActiveOffer(offer({ validTo: "2026-10-05" }), now), false, "expired by India date");
    assert.equal(rules.isActiveOffer(offer({ validFrom: "2026-10-07" }), now), false, "future");
    assert.equal(rules.isActiveOffer(offer({ isDemo: true }), now), false);
  });

  test("AI knowledge: approved + public only", () => {
    const row = { topic: "parking", question: "q", answer: "a" };
    const result = usableKnowledge([
      { ...row, id: "ok", public: true, approved: true },
      { ...row, id: "unapproved", public: true, approved: false },
      { ...row, id: "private", public: false, approved: true },
    ]);
    assert.deepEqual(result.map((entry) => entry.id), ["ok"]);
  });

  test("announcements respect their window; media provenance gates property photography", () => {
    const now = new Date("2026-10-05T00:00:00Z");
    assert.equal(rules.isLiveAnnouncement({ published: true, publishFrom: "2026-10-01T00:00:00Z", publishUntil: "2026-10-06T00:00:00Z" }, now), true);
    assert.equal(rules.isLiveAnnouncement({ published: true, publishFrom: "2026-10-06T00:00:00Z", publishUntil: null }, now), false);
    assert.equal(rules.isLiveAnnouncement({ published: false, publishFrom: null, publishUntil: null }, now), false);
    assert.deepEqual((["tejjora", "licensed", "illustrative", "placeholder"] as const).map(rules.isPropertyMedia), [true, true, false, false]);
  });
});

describe("room id regression", () => {
  test("the three stable ids are unchanged everywhere", () => {
    const expected = ["deluxe", "super-deluxe", "premium"];
    assert.deepEqual([...ROOM_IDS], expected);
    assert.deepEqual(rooms.map((room) => room.id), expected);
    assert.deepEqual(catalog.roomRows().map((row) => row.id), expected);
    assert.deepEqual(catalog.roomRows().map((row) => row.slug), expected, "slugs equal ids");
    assert.deepEqual(Object.keys(commerceConfig.roomRates).sort(), [...expected].sort());
    const booking = readFileSync(path.join(root, "db/migrations/001_booking_core.sql"), "utf8");
    for (const id of expected) assert.match(booking, new RegExp(`'${id}'`));
  });

  test("no migration renames or deletes room ids", () => {
    for (const file of readdirSync(path.join(root, "db/migrations"))) {
      const sql = readFileSync(path.join(root, "db/migrations", file), "utf8");
      assert.doesNotMatch(sql, /UPDATE\s+(room_types|rooms)\s+SET\s+id/i, file);
      assert.doesNotMatch(sql, /DELETE\s+FROM\s+(room_types|rooms|reservations)/i, file);
    }
  });
});

describe("menu integrity (hotel Room Menu, content ledger §3)", () => {
  const items = restaurantMenu.flatMap((category) => category.items);

  test("12 categories, 90 items, 5 egg items, verified operating notes", () => {
    assert.equal(restaurantMenu.length, 12);
    assert.equal(items.length, 90);
    assert.deepEqual(
      items.filter((item) => item.containsEgg).map((item) => item.name).sort(),
      ["Boiled Egg", "Cheese Omelette", "Egg Bhurji", "Egg Biryani", "Egg Fried Rice"],
    );
    assert.equal(items.find((item) => item.name === "Paneer Butter Masala")?.priceFull, 280);
    assert.equal(restaurantMenuSettings.prepMinutesMin, 30);
    assert.equal(restaurantMenuSettings.prepMinutesMax, 40);
    assert.equal(restaurantMenuSettings.serviceChargePct, 5);
    assert.equal(restaurantMenuSettings.taxesNote, "Taxes as applicable");
    assert.equal(restaurantMenuSettings.publicName, null);
    assert.equal(restaurantMenuSettings.openingTime, null);
    assert.equal(restaurantMenuSettings.roomDeliveryEnabled, null);
  });

  test("ids are unique; questionable prices are kept as printed and flagged", () => {
    assert.equal(new Set(items.map((item) => item.id)).size, 90);
    const noodles = items.find((item) => item.id === "paneer-noodles");
    assert.equal(noodles?.priceFull, 200);
    assert.match(noodles?.reviewNote ?? "", /owner to confirm/);
    assert.ok(items.every((item) => !("priceHalf" in item)), "no half prices are invented");
  });

  test("no unsupported vegetarian-only claim anywhere in src/ or db/", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx?|mjs|sql|json|css)$/.test(name) && /pure[\s-]*veg/i.test(readFileSync(full, "utf8"))) offenders.push(path.relative(root, full));
      }
    };
    walk(path.join(root, "src"));
    walk(path.join(root, "db"));
    assert.deepEqual(offenders, []);
  });
});

describe("structured data uses verified public facts only", () => {
  test("hotel schema from facts; nothing unverified; script-safe output", async () => {
    const { data: facts } = await getPublicPropertyFacts();
    const hotel = hotelSchema(facts) as Record<string, unknown> & { address: Record<string, string> };
    assert.equal(hotel.name, "Tejjora Lake View");
    assert.equal(hotel.telephone, "+91 96211 34909");
    assert.equal(hotel.address.streetAddress, "C-1/242, Vikalp Khand, Gomti Nagar");
    assert.equal(hotel.address.postalCode, "226010");
    assert.ok(!("aggregateRating" in hotel));
    assert.ok(!JSON.stringify(hotel).includes("14:00"), "conflicting check-in time is not published");

    const empty = { entries: [], get: () => undefined, text: () => undefined };
    assert.equal(hotelSchema(empty), null);
    assert.deepEqual(presentSchemas(hotelSchema(empty), faqSchema([])), []);

    const html = renderToStaticMarkup(createElement(StructuredData, { data: { name: "</script><script>alert(1)</script>" } }));
    assert.ok(!html.includes("</script><script>"), html);
  });
});
