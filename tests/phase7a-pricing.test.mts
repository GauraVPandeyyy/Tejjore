import { strict as assert } from "node:assert";
import { randomBytes, scryptSync } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, test } from "node:test";
import { isolateEnv, setEnv } from "./setup/env.mts";

// Phase 7A: one price everywhere. The admin booking configuration (Admin → Rooms base rate and
// dated rates) is the only source for every displayed room price: rooms, room pages, comparison,
// booking step, quote and concierge. These tests change the admin rate and follow it through.
const BASE = "http://localhost:3000";
const hash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
};
const USERS = [{ id: "owner", name: "Hotel Owner", role: "owner", passwordHash: hash("owner-pass-123") }];
const usersJson = JSON.stringify(USERS);
const { storePath } = isolateEnv({ ADMIN_USERS_JSON: usersJson, ADMIN_SESSION_SECRET: randomBytes(32).toString("hex") });

const { commerceConfig, formatMoney } = await import("../src/data/commerce");
const { buildRoomRateCard, rateCardNote, stayRoomSubtotal, averageNightlyRate } = await import("../src/lib/booking/rateCard");
const { defaultOperationsConfig } = await import("../src/lib/booking/operations");
const { getPublicRoomRates } = await import("../src/lib/booking/publicRates");
const { getRooms } = await import("../src/lib/content/rooms");
const { getRestaurantMenu } = await import("../src/lib/content/restaurant");
const { todayInIndia } = await import("../src/lib/booking/validation");
const { hybridConciergeProvider } = await import("../src/lib/concierge/hybridProvider");
const { setRevalidateSpyForTests } = await import("../src/lib/content/revalidate");
const { memoryAdminPersistence, setAdminPersistenceForTests } = await import("../src/lib/admin/persistence");
const { resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const loginRoute = await import("../src/app/api/admin/auth/login/route");
const roomsRoute = await import("../src/app/api/admin/rooms/[roomId]/route");
const overridesRoute = await import("../src/app/api/admin/inventory/overrides/route");
const availabilityRoute = await import("../src/app/api/availability/route");
const quoteRoute = await import("../src/app/api/reservations/quote/route");

function request(method: string, pathname: string, { cookie, body }: { cookie?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { origin: BASE };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${BASE}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });

async function ownerCookie() {
  const response = await loginRoute.POST(request("POST", "/api/admin/auth/login", { body: { userId: "owner", password: "owner-pass-123" } }));
  assert.equal(response.status, 200);
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}
function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
async function ask(content: string) {
  return hybridConciergeProvider.reply([{ role: "user", content }]);
}

let revalidated: string[][] = [];
beforeEach(() => {
  writeFileSync(storePath, JSON.stringify({ reservations: [], blocks: [], processedWebhookIds: [] }));
  setAdminPersistenceForTests(memoryAdminPersistence());
  resetMemoryRateLimits();
  setEnv({ ADMIN_USERS_JSON: usersJson, NODE_ENV: "test" });
  revalidated = [];
  setRevalidateSpyForTests((tags) => void revalidated.push(tags));
});

describe("rate card (pure)", () => {
  const today = "2026-10-07";

  test("defaults: from = standard = tonight; no caveat", () => {
    const card = buildRoomRateCard(defaultOperationsConfig(), "deluxe", today);
    assert.equal(card.standardRate, commerceConfig.roomRates.deluxe);
    assert.equal(card.fromRate, card.standardRate);
    assert.equal(card.tonightRate, card.standardRate);
    assert.equal(card.datedRates, false);
    assert.equal(rateCardNote(card, formatMoney), null);
  });

  test("a cheaper upcoming dated rate lowers 'from' and is labelled; past and far-future dates are ignored", () => {
    const config = defaultOperationsConfig();
    config.roomSettings.deluxe.baseRate = 3000;
    config.dateOverrides = [
      { id: "past", roomId: "deluxe", date: "2026-10-01", baseRate: 1000 },
      { id: "far", roomId: "deluxe", date: "2028-01-01", baseRate: 1200 },
      { id: "soon", roomId: "deluxe", date: "2026-11-10", baseRate: 2400 },
      { id: "other", roomId: "premium", date: "2026-11-10", baseRate: 100 },
    ];
    const card = buildRoomRateCard(config, "deluxe", today);
    assert.equal(card.fromRate, 2400);
    assert.equal(card.standardRate, 3000);
    assert.equal(card.tonightRate, 3000);
    assert.match(rateCardNote(card, formatMoney)!, /Standard rate ₹3,000/);
  });

  test("a dearer dated rate never raises 'from' but is flagged; tonight's dated rate is reported", () => {
    const config = defaultOperationsConfig();
    config.dateOverrides = [{ id: "peak", roomId: "premium", date: today, baseRate: 5000 }];
    const card = buildRoomRateCard(config, "premium", today);
    assert.equal(card.fromRate, commerceConfig.roomRates.premium);
    assert.equal(card.tonightRate, 5000);
    assert.equal(card.datedRates, true);
    assert.equal(rateCardNote(card, formatMoney), "Some dates are priced differently");
  });

  test("stay helpers sum exactly and average for display", () => {
    const nights = [{ rate: 2000 }, { rate: 2500 }, { rate: 2501 }];
    assert.equal(stayRoomSubtotal(nights), 7001);
    assert.equal(averageNightlyRate(nights), 2334);
    assert.equal(averageNightlyRate([]), 0);
  });
});

describe("admin rate → every surface", () => {
  test("a base-rate change reaches rooms, concierge, availability and the quote with one number", async () => {
    const cookie = await ownerCookie();
    const saved = await roomsRoute.PUT(request("PUT", "/api/admin/rooms/deluxe", { cookie, body: { baseRate: 2750, totalInventory: 10 } }), params({ roomId: "deluxe" }));
    assert.equal(saved.status, 200);
    assert.ok(revalidated.flat().includes("tejjora:rates"), "public prices are invalidated immediately");

    const rates = await getPublicRoomRates();
    assert.equal(rates?.deluxe?.fromRate, 2750);

    const { data: rooms } = await getRooms();
    const deluxe = rooms.find((room) => room.id === "deluxe")!;
    assert.equal(deluxe.startingPrice, 2750, "rooms pages show the admin rate, not the static default");
    assert.equal(deluxe.rate?.standardRate, 2750);
    for (const room of rooms) assert.equal(room.startingPrice, rates?.[room.id]?.fromRate, `${room.id}: card price = rate card`);

    const reply = await ask("What are the current room rates?");
    assert.equal(reply.intent, "live-rates");
    assert.match(reply.content, /Deluxe Room from ₹2,750/);
    const card = reply.cards?.find((item) => item.kind === "rates");
    assert.ok(card && card.kind === "rates");
    for (const item of card.rooms) assert.equal(item.fromRate, rooms.find((room) => room.id === item.id)!.startingPrice, `${item.id}: concierge = rooms page`);

    const checkIn = addDays(todayInIndia(), 20);
    const checkOut = addDays(checkIn, 2);
    const availability = await availabilityRoute.POST(request("POST", "/api/availability", { body: { checkIn, checkOut } }));
    const inventory = (await availability.json()) as { rooms: Array<{ roomId: string; nightlyRates: Array<{ rate: number }> }> };
    const nightly = inventory.rooms.find((room) => room.roomId === "deluxe")!.nightlyRates;
    assert.deepEqual(nightly.map((night) => night.rate), [2750, 2750]);

    const quote = await quoteRoute.POST(request("POST", "/api/reservations/quote", { body: { stay: { checkIn, checkOut, adults: 2, children: 0, rooms: 1 }, roomId: "deluxe", ratePlanId: "room-only", addonIds: [] } }));
    assert.equal(quote.status, 200);
    const { pricing } = (await quote.json()) as { pricing: { roomSubtotal: number } };
    assert.equal(pricing.roomSubtotal, stayRoomSubtotal(nightly), "selected-date quote = availability nightly rates");

    const dated = await ask(`Is a deluxe room available from ${checkIn} to ${checkOut}?`);
    const stay = dated.cards?.find((item) => item.kind === "availability");
    assert.ok(stay && stay.kind === "availability");
    assert.equal(stay.rooms.find((room) => room.id === "deluxe")?.stayTotal, pricing.roomSubtotal, "concierge stay price = quote");
    assert.ok(stay.preview, "development inventory is labelled as preview");
    assert.ok(stay.rooms.every((room) => room.available === -1), "preview room counts are never shown");
  });

  test("a cheaper dated rate lowers 'from' everywhere and prices that night exactly", async () => {
    const cookie = await ownerCookie();
    const date = addDays(todayInIndia(), 30);
    const saved = await overridesRoute.PUT(request("PUT", "/api/admin/inventory/overrides", { cookie, body: { roomId: "super-deluxe", date, baseRate: 1999 } }));
    assert.equal(saved.status, 200);
    assert.ok(revalidated.flat().includes("tejjora:rates"));

    const room = (await getRooms()).data.find((item) => item.id === "super-deluxe")!;
    assert.equal(room.startingPrice, 1999);
    assert.equal(room.rate?.standardRate, commerceConfig.roomRates["super-deluxe"]);
    const card = (await ask("room rates please")).cards?.find((item) => item.kind === "rates");
    assert.ok(card && card.kind === "rates");
    assert.equal(card.rooms.find((item) => item.id === "super-deluxe")?.fromRate, 1999);
    assert.match(card.rooms.find((item) => item.id === "super-deluxe")!.note!, /some dates cost less/);

    const quote = await quoteRoute.POST(request("POST", "/api/reservations/quote", { body: { stay: { checkIn: date, checkOut: addDays(date, 2), adults: 2, children: 0, rooms: 1 }, roomId: "super-deluxe", ratePlanId: "room-only", addonIds: [] } }));
    const { pricing } = (await quote.json()) as { pricing: { roomSubtotal: number; nightlyRates: Array<{ rate: number }> } };
    assert.deepEqual(pricing.nightlyRates.map((night) => night.rate), [1999, commerceConfig.roomRates["super-deluxe"]]);
  });

  test("an unreadable booking configuration hides prices instead of guessing", async () => {
    writeFileSync(storePath, "{ not json");
    assert.equal(await getPublicRoomRates(), null);
    const { data: rooms } = await getRooms();
    assert.ok(rooms.every((room) => room.startingPrice === null && room.rate === null));
    const reply = await ask("What are the room rates?");
    assert.equal(reply.intent, "live-rates-unavailable");
    assert.doesNotMatch(reply.content, /₹/);
  });
});

describe("no hardcoded nightly prices", () => {
  const root = path.resolve(import.meta.dirname, "..");
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }
  const sources = files(path.join(root, "src")).map((file) => ({ file: path.relative(root, file).replaceAll("\\", "/"), text: readFileSync(file, "utf8") }));

  test("static default rates are read only by the engine's defaults, never by a page, component or content", () => {
    const allowed = new Set(["src/data/commerce.ts", "src/lib/booking/operations.ts", "src/lib/booking/pricing.ts"]);
    const offenders = sources.filter((source) => /\broomRates\b/.test(source.text) && !allowed.has(source.file)).map((source) => source.file);
    assert.deepEqual(offenders, []);
  });

  test("UI and content files carry no literal room rate", () => {
    const rates = Object.values(commerceConfig.roomRates);
    const pattern = new RegExp(`(₹|Rs\\.?|INR)\\s?(${rates.map((rate) => `${rate}|${rate.toLocaleString("en-IN")}`).join("|")})\\b`);
    const offenders = sources
      .filter((source) => /^(src\/(app|components|data)\/)/.test(source.file) && source.file !== "src/data/commerce.ts")
      .filter((source) => pattern.test(source.text))
      .map((source) => source.file);
    assert.deepEqual(offenders, []);
    const rooms = sources.find((source) => source.file === "src/data/rooms.ts")!;
    assert.doesNotMatch(rooms.text, /startingPrice:(?!\s*null\b)/, "room content has no price of its own");
  });

  test("booking UI never prices without the live nightly rates", () => {
    for (const file of ["src/components/booking/BookingExperience.tsx", "src/components/booking/BookingSummary.tsx"]) {
      const text = sources.find((source) => source.file === file)!.text;
      assert.doesNotMatch(text, /baseRate:\s*inventory/, `${file} must not fall back to a default rate`);
      assert.doesNotMatch(text, /startingPrice/, `${file} must not show a content price`);
    }
  });
});

describe("concierge grounding (Phase 7A cards)", () => {
  test("dishes come from the published menu with its printed prices", async () => {
    const reply = await ask("Do you have paneer tikka?");
    assert.equal(reply.intent, "menu-dishes");
    const card = reply.cards?.find((item) => item.kind === "dishes");
    assert.ok(card && card.kind === "dishes");
    const { data: menu } = await getRestaurantMenu();
    const all = menu.flatMap((category) => category.items);
    for (const dish of card.dishes) assert.equal(dish.price, all.find((item) => item.name === dish.name)?.priceFull);
    assert.ok(card.dishes.some((dish) => dish.name === "Paneer Tikka"));
  });

  test("room questions are never answered with menu prices", async () => {
    assert.notEqual((await ask("Is there tea in the room?")).intent, "menu-dishes");
    assert.notEqual((await ask("Is there hot water?")).intent, "menu-dishes");
    assert.notEqual((await ask("Is breakfast available during my stay?")).intent, "menu-dishes");
  });

  test("restaurant answers use verified settings and carry the menu card", async () => {
    const reply = await ask("Tell me about the restaurant");
    assert.equal(reply.intent, "restaurant");
    assert.doesNotMatch(reply.content, /last orders/i);
    assert.ok(reply.cards?.some((item) => item.kind === "menu"));
  });

  test("offers: no invented discount when none is published", async () => {
    const reply = await ask("Any discount or offer?");
    assert.ok(reply.intent === "offers" || reply.intent === "offers-none");
    if (reply.intent === "offers-none") assert.match(reply.content, /won't invent a discount/);
  });

  test("booking status stays private; unknown facts are not guessed", async () => {
    const status = await ask("What is my booking status for TLV-ABCD-EFGH-JK?");
    assert.equal(status.intent, "booking-status-privacy");
    assert.equal(status.cards, undefined);
    const unknown = await ask("Do you have a swimming pool?");
    assert.equal(unknown.intent, "fallback");
  });
});

describe("cleanup: home h1 and price wording", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const read = (file: string) => readFileSync(path.join(root, file), "utf8");

  test("home hero has exactly one accessible h1 that labels the hero", () => {
    const hero = read("src/components/home/HomeHero.tsx").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    assert.equal((hero.match(/<h1\b/g) ?? []).length, 1);
    assert.match(hero, /<h1 id="hero-title"[^>]*>\s*Tejjora Lake View[^<]*Lucknow/);
    assert.match(hero, /aria-labelledby="hero-title"/);
    const page = read("src/app/page.tsx") + read("src/components/home/HomeSections.tsx");
    assert.doesNotMatch(page, /<h1\b/, "no second h1 on the home page");
  });

  test("price copy claims only a single website pricing source", () => {
    const files = ["src/components/hotel/BookDirect.tsx", "src/components/rooms/RoomsIndex.tsx", "src/app/rooms/[slug]/page.tsx", "src/components/concierge/ConciergeCards.tsx", "src/lib/concierge/hybridProvider.ts"];
    for (const file of files) {
      // Comments may name what is not claimed; only shipped copy is checked.
      const text = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      assert.doesNotMatch(text, /one price,? everywhere|same everywhere|best (price|rate)|price match|lowest price|cheaper than/i, file);
      assert.doesNotMatch(text, /same live (direct )?rates?/i, file);
    }
    assert.match(read("src/components/hotel/BookDirect.tsx"), /come from the same current booking system/);
    assert.match(read("src/components/rooms/RoomsIndex.tsx"), /this website’s current booking system/);
    assert.match(read("src/app/rooms/[slug]/page.tsx"), /this website’s current booking system/);
  });
});
