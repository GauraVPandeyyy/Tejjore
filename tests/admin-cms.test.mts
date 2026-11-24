import { strict as assert } from "node:assert";
import { randomBytes, scryptSync } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import sharp from "sharp";
import { isolateEnv, setEnv } from "./setup/env.mts";
import { createTestDatabase, type TestDatabase } from "./setup/pglite.mts";

// Phase 3B/3C: the admin CMS. Every case runs against a disposable, migrated and seeded PGlite
// database routed through the production content path (contentDatabase), never DATABASE_URL.
// Public reflection is checked with the real Phase 2 getters, called the way pages call them.
const BASE = "http://localhost:3000";
const hash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
};
const USERS = [
  { id: "owner", name: "Hotel Owner", role: "owner", passwordHash: hash("owner-pass-123") },
  { id: "manager", name: "Duty Manager", role: "manager", passwordHash: hash("manager-pass-123") },
  { id: "desk", name: "Front Desk", role: "front_desk", passwordHash: hash("desk-pass-123") },
  { id: "kitchen", name: "Kitchen", role: "kitchen", passwordHash: hash("kitchen-pass-123") },
];
const usersJson = JSON.stringify(USERS);
isolateEnv({ ADMIN_USERS_JSON: usersJson, ADMIN_SESSION_SECRET: randomBytes(32).toString("hex") });

const { memoryAdminPersistence, setAdminPersistenceForTests } = await import("../src/lib/admin/persistence");
const { resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const { setContentDatabaseForTests } = await import("../src/lib/content/db");
const { setRevalidateSpyForTests } = await import("../src/lib/content/revalidate");
const { resetContentCircuit } = await import("../src/lib/content/source");
const { memoryMediaStorage, setMediaStorageForTests } = await import("../src/lib/admin/media/storage");
const { sniffImageFormat, MEDIA_MAX_BYTES } = await import("../src/lib/admin/media/process");
const { getRooms } = await import("../src/lib/content/rooms");
const { getPublicPropertyFacts } = await import("../src/lib/content/facts");
const { getPublishedPolicies } = await import("../src/lib/content/policies");
const { getPublishedTestimonials } = await import("../src/lib/content/testimonials");
const { getActiveOffers } = await import("../src/lib/content/offers");
const { getRestaurantMenu } = await import("../src/lib/content/restaurant");
const { getApprovedAiKnowledge } = await import("../src/lib/content/aiKnowledge");
const { getReadyTourScenes } = await import("../src/lib/content/tour");
const { getSeoPage } = await import("../src/lib/content/seo");
const { commerceConfig } = await import("../src/data/commerce");
const loginRoute = await import("../src/app/api/admin/auth/login/route");
const cmsRoute = await import("../src/app/api/admin/cms/[resource]/route");
const cmsItemRoute = await import("../src/app/api/admin/cms/[resource]/[key]/route");
const mediaRoute = await import("../src/app/api/admin/media/route");
const linksRoute = await import("../src/app/api/admin/media/links/route");
const ordersRoute = await import("../src/app/api/admin/restaurant/orders/route");
const orderRoute = await import("../src/app/api/admin/restaurant/orders/[reference]/route");
const previewRoute = await import("../src/app/api/admin/ai-knowledge/preview/route");
const staffRoute = await import("../src/app/api/admin/staff/route");
const staffSessionsRoute = await import("../src/app/api/admin/staff/sessions/route");
const overviewRoute = await import("../src/app/api/admin/overview/route");

type Json = Record<string, unknown> & { error?: { code: string; message: string; fields?: Record<string, string> } };

let database: TestDatabase;
let adminStore: ReturnType<typeof memoryAdminPersistence>;
let revalidated: string[][] = [];
const cookies: Record<string, string> = {};

function request(method: string, pathname: string, { cookie, body, form }: { cookie?: string; body?: unknown; form?: FormData } = {}) {
  const headers: Record<string, string> = { origin: BASE };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${BASE}${pathname}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
}
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });
const json = async (response: Response) => (await response.json()) as Json;

async function login(user: string) {
  const response = await loginRoute.POST(request("POST", "/api/admin/auth/login", { body: { userId: user, password: `${user}-pass-123` } }));
  assert.equal(response.status, 200, `login ${user}`);
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}
const as = (user: keyof typeof cookies | string) => cookies[user];

const list = (user: string, resource: string) => cmsRoute.GET(request("GET", `/api/admin/cms/${resource}`, { cookie: as(user) }), params({ resource }));
const create = (user: string, resource: string, body: unknown) => cmsRoute.POST(request("POST", `/api/admin/cms/${resource}`, { cookie: as(user), body }), params({ resource }));
const patch = (user: string, resource: string, key: string, body: unknown) =>
  cmsItemRoute.PATCH(request("PATCH", `/api/admin/cms/${resource}/${key}`, { cookie: as(user), body }), params({ resource, key }));
const remove = (user: string, resource: string, key: string) =>
  cmsItemRoute.DELETE(request("DELETE", `/api/admin/cms/${resource}/${key}`, { cookie: as(user) }), params({ resource, key }));
const audit = async () => (await adminStore.listAudit({}, 500, 0)).items;

before(async () => {
  database = await createTestDatabase({ seed: true });
  setContentDatabaseForTests(database.db);
  adminStore = memoryAdminPersistence();
  setAdminPersistenceForTests(adminStore);
  setRevalidateSpyForTests((tags) => void revalidated.push(tags));
  setMediaStorageForTests(memoryMediaStorage());
  setEnv({ ADMIN_USERS_JSON: usersJson, NODE_ENV: "test" });
  for (const user of ["owner", "manager", "desk", "kitchen"]) {
    resetMemoryRateLimits();
    cookies[user] = await login(user);
  }
});

after(async () => {
  setContentDatabaseForTests(null);
  setAdminPersistenceForTests(null);
  setRevalidateSpyForTests(null);
  setMediaStorageForTests(null);
  await database.close();
});

beforeEach(() => {
  revalidated = [];
  resetContentCircuit();
});

describe("Phase 3B/3C admin CMS", () => {
  test("role restrictions: each role reaches only its modules", async () => {
    assert.equal((await list("manager", "rooms")).status, 200);
    assert.equal((await list("desk", "rooms")).status, 403);
    assert.equal((await list("desk", "facts")).status, 403);
    assert.equal((await list("kitchen", "offers")).status, 403);
    assert.equal((await list("kitchen", "ai-knowledge")).status, 403);
    assert.equal((await list("kitchen", "menu-items")).status, 200);
    assert.equal((await list("desk", "menu-items")).status, 403);
    assert.equal((await patch("desk", "rooms", "deluxe", { name: "X" })).status, 403);
    assert.equal((await create("kitchen", "faqs", { category: "general", question: "Q?", answer: "A." })).status, 403);
    assert.equal((await list("owner", "nope")).status, 404);
    assert.equal((await cmsRoute.GET(request("GET", "/api/admin/cms/rooms"), params({ resource: "rooms" }))).status, 401);
    // Cross-site mutation is refused before any session lookup.
    const crossSite = new Request(`${BASE}/api/admin/cms/rooms/deluxe`, { method: "PATCH", headers: { origin: "https://evil.example", cookie: as("owner"), "content-type": "application/json" }, body: "{}" });
    assert.equal((await cmsItemRoute.PATCH(crossSite, params({ resource: "rooms", key: "deluxe" }))).status, 403);
  });

  test("rooms: stable ids cannot change; edits reach the public getter; pricing stays with booking", async () => {
    const renamed = await patch("manager", "rooms", "deluxe", { id: "luxury" });
    assert.equal(renamed.status, 400);
    assert.match((await json(renamed)).error!.fields!.id, /stable key/);
    assert.equal((await patch("manager", "rooms", "deluxe", { slug: "luxury" })).status, 400);
    assert.equal((await create("owner", "rooms", { name: "Penthouse" })).status, 403);
    assert.equal((await remove("owner", "rooms", "deluxe")).status, 403);

    const saved = await patch("manager", "rooms", "deluxe", { name: "Deluxe Room (edited)", summary: "Edited summary.", amenities: ["Wi-Fi", "Tea & coffee"] });
    assert.equal(saved.status, 200);
    assert.deepEqual(revalidated, [["tejjora:rooms"]], "only the rooms tag is invalidated");
    const room = (await getRooms()).data.find((item) => item.id === "deluxe")!;
    assert.equal(room.name, "Deluxe Room (edited)");
    assert.equal(room.shortDescription, "Edited summary.");
    assert.deepEqual(room.amenities.map((item) => item.label), ["Wi-Fi", "Tea & coffee"]);
    assert.equal(room.sizeSqFt, null, "unknown specs stay null");
    assert.equal(room.startingPrice, commerceConfig.roomRates.deluxe ?? null, "price still comes from the booking configuration");
    assert.deepEqual((await getRooms()).data.map((item) => item.id).sort(), ["deluxe", "premium", "super-deluxe"]);

    const entry = (await audit()).find((item) => item.action === "room.updated" && item.entityId === "deluxe")!;
    assert.equal(entry.actor, "manager");
    assert.equal(entry.role, "manager");
    const detail = await adminStore.getAudit(entry.id);
    assert.deepEqual((detail!.diff as { changes: { name: { to: string } } }).changes.name.to, "Deluxe Room (edited)");
  });

  test("property facts: only verified + public facts are published", async () => {
    const created = await create("manager", "facts", { key: "contact.whatsapp", value: "\"+91 90000 00000\"", status: "provisional", source: "SRC-TEST", public: true });
    assert.equal(created.status, 400);
    assert.match((await json(created)).error!.fields!.public, /verified/);
    assert.equal((await create("manager", "facts", { key: "contact.whatsapp", value: "\"+91 90000 00000\"", status: "provisional", source: "SRC-TEST", public: false })).status, 201);
    assert.equal((await getPublicPropertyFacts()).data.get("contact.whatsapp"), undefined);

    assert.equal((await patch("manager", "facts", "contact.whatsapp", { public: true })).status, 400, "provisional cannot go public");
    assert.equal((await patch("manager", "facts", "contact.whatsapp", { status: "verified", public: true })).status, 200);
    assert.deepEqual(revalidated.at(-1), ["tejjora:facts"]);
    assert.equal((await getPublicPropertyFacts()).data.get("contact.whatsapp"), "+91 90000 00000");
    const row = (await database.db.query<{ updated_by: string }>("SELECT updated_by FROM property_facts WHERE key = 'contact.whatsapp'")).rows[0];
    assert.equal(row.updated_by, "manager");

    assert.equal((await patch("manager", "facts", "contact.whatsapp", { status: "conflict" })).status, 400, "a public fact must be made private before leaving verified");
    assert.equal((await patch("manager", "facts", "contact.whatsapp", { status: "conflict", public: false })).status, 200);
    assert.equal((await getPublicPropertyFacts()).data.get("contact.whatsapp"), undefined);
    assert.equal((await create("manager", "facts", { key: "bad", value: "{not json", status: "verified", source: "x" })).status, 400);
  });

  test("policies: publishing needs approval, and new wording withdraws it", async () => {
    const created = await json(await create("manager", "policies", { slug: "pets", title: "Pets", body: "Pets are not allowed." }));
    const id = String((created.row as Record<string, unknown>).id);
    const blocked = await patch("manager", "policies", id, { published: true });
    assert.equal(blocked.status, 400);
    assert.match((await json(blocked)).error!.fields!.published, /approves/);

    assert.equal((await patch("manager", "policies", id, { approved: true, published: true })).status, 200);
    let policies = (await getPublishedPolicies()).data;
    assert.ok(policies.some((policy) => policy.title === "Pets"));
    const approved = (await database.db.query<{ approved_by: string }>("SELECT approved_by FROM policies WHERE id = $1", [id])).rows[0];
    assert.equal(approved.approved_by, "manager");

    const edited = await json(await patch("manager", "policies", id, { body: "Small pets are welcome on request." }));
    assert.match((edited.notices as string[]).join(" "), /approval again/);
    assert.equal((edited.row as Record<string, unknown>).published, false);
    assert.equal((edited.row as Record<string, unknown>).approved, false);
    policies = (await getPublishedPolicies()).data;
    assert.ok(!policies.some((policy) => policy.title === "Pets"), "unapproved wording is withdrawn from the public page");
  });

  test("testimonials: demo reviews can never be published or turned genuine", async () => {
    assert.equal((await create("manager", "testimonials", { author_display: "Demo", text: "Lovely.", source: "demo", consent: true, published: true })).status, 400);
    const demo = await json(await create("manager", "testimonials", { author_display: "Demo", text: "Lovely.", source: "demo" }));
    const demoId = String((demo.row as Record<string, unknown>).id);
    const converted = await patch("manager", "testimonials", demoId, { source: "direct" });
    assert.equal(converted.status, 400);
    assert.match((await json(converted)).error!.fields!.source, /demo review cannot become/);
    assert.equal((await create("manager", "testimonials", { author_display: "A. Guest", text: "Great stay.", source: "google", consent: true, published: true })).status, 400, "Google reviews need their link");
    assert.equal((await create("manager", "testimonials", { author_display: "A. Guest", text: "Great stay.", source: "direct", published: true })).status, 400, "consent required");
    assert.equal((await create("manager", "testimonials", { author_display: "A. Guest", text: "Great stay.", source: "direct", consent: true, published: true })).status, 201);
    const shown = (await getPublishedTestimonials()).data;
    assert.deepEqual(shown.map((item) => item.authorDisplay), ["A. Guest"]);
  });

  test("offers: only active, published, non-demo offers are public; demo approval is owner-only", async () => {
    const demo = (await database.db.query<{ id: string }>("SELECT id FROM offers WHERE is_demo ORDER BY id LIMIT 1")).rows[0];
    assert.equal((await patch("manager", "offers", demo.id, { published: true })).status, 400);
    assert.match((await json(await patch("manager", "offers", demo.id, { is_demo: false }))).error!.fields!.is_demo, /owner/);
    assert.equal((await getActiveOffers()).data.length, 0);

    const future = await create("manager", "offers", { slug: "monsoon", title: "Monsoon stay", valid_from: "2099-07-01", valid_to: "2099-08-31", room_ids: ["deluxe"], published: true });
    assert.equal(future.status, 201);
    assert.equal((await create("manager", "offers", { slug: "bad-window", title: "Bad", valid_from: "2026-02-01", valid_to: "2026-01-01" })).status, 400);
    assert.equal((await create("manager", "offers", { slug: "bad-room", title: "Bad", room_ids: ["penthouse"] })).status, 400);
    assert.equal((await create("manager", "offers", { slug: "bad-pct", title: "Bad", adjustment_type: "percent", adjustment_value: 150 })).status, 400);
    const live = await create("manager", "offers", { slug: "weekday", title: "Weekday rate", promo_code: "weekday10", adjustment_type: "percent", adjustment_value: 10, published: true });
    assert.equal(live.status, 201);
    assert.equal(((await json(live)).row as Record<string, unknown>).promo_code, "WEEKDAY10");
    assert.deepEqual((await getActiveOffers()).data.map((offer) => offer.slug), ["weekday"], "future offers wait for their window");

    assert.equal((await patch("owner", "offers", demo.id, { is_demo: false })).status, 200);
    assert.equal((await patch("owner", "offers", demo.id, { published: true })).status, 200);
    assert.equal((await getActiveOffers()).data.length, 2);
  });

  test("restaurant: kitchen toggles availability only; managers edit prices; menu stays 12/90", async () => {
    const off = await patch("kitchen", "menu-items", "paneer-butter-masala", { available: false });
    assert.equal(off.status, 200);
    assert.deepEqual(revalidated.at(-1), ["tejjora:menu"]);
    const item = (await getRestaurantMenu()).data.flatMap((category) => category.items).find((entry) => entry.id === "paneer-butter-masala")!;
    assert.equal(item.available, false);
    assert.equal(item.priceFull, 280);

    assert.equal((await patch("kitchen", "menu-items", "paneer-butter-masala", { price_full: 1 })).status, 403);
    assert.equal((await patch("kitchen", "menu-items", "paneer-butter-masala", { available: true, name: "Renamed" })).status, 403);
    assert.equal((await patch("kitchen", "restaurant-settings", "1", { opening_time: "07:00" })).status, 403);
    assert.equal((await create("kitchen", "menu-items", { id: "new-dish", category_id: "soups", name: "New", price_full: 100 })).status, 403);
    assert.equal((await patch("manager", "menu-items", "paneer-butter-masala", { price_half: 300 })).status, 400, "half price cannot exceed full");
    assert.equal((await patch("manager", "menu-items", "paneer-butter-masala", { price_full: 290, available: true })).status, 200);
    assert.equal((await getRestaurantMenu()).data.flatMap((category) => category.items).find((entry) => entry.id === "paneer-butter-masala")!.priceFull, 290);

    const settings = await json(await list("kitchen", "restaurant-settings"));
    const row = (settings.items as Array<Record<string, unknown>>)[0];
    assert.equal(row.opening_time, null, "the unknown opening time is not invented");
    const counts = (await database.db.query<{ categories: number; items: number; halves: number }>(
      "SELECT (SELECT count(*)::int FROM menu_categories) AS categories, (SELECT count(*)::int FROM menu_items) AS items, (SELECT count(*)::int FROM menu_items WHERE price_half IS NOT NULL) AS halves",
    )).rows[0];
    assert.deepEqual(counts, { categories: 12, items: 90, halves: 0 });
  });

  test("restaurant orders queue: masked list, kitchen transitions, desk read-only, audited", async () => {
    const empty = await json(await ordersRoute.GET(request("GET", "/api/admin/restaurant/orders", { cookie: as("kitchen") })));
    assert.equal(empty.total, 0);
    await database.db.query(
      `INSERT INTO menu_orders (reference, room_number, guest_name, phone_e164, subtotal, service_charge, total_excl_tax) VALUES ('TLO-ABCD1234', '204', 'Guest', '+919876543210', 280, 14, 294)`,
    );
    const queue = await json(await ordersRoute.GET(request("GET", "/api/admin/restaurant/orders", { cookie: as("desk") })));
    const order = (queue.items as Array<Record<string, unknown>>)[0];
    assert.equal(order.phoneLast4, "3210");
    assert.equal(JSON.stringify(queue).includes("+919876543210"), false, "the full phone never leaves the server");
    assert.deepEqual(order.nextStatuses, ["accepted", "declined"]);

    const move = (user: string, body: unknown) => orderRoute.PATCH(request("PATCH", "/api/admin/restaurant/orders/TLO-ABCD1234", { cookie: as(user), body }), params({ reference: "TLO-ABCD1234" }));
    assert.equal((await move("desk", { status: "accepted" })).status, 403);
    assert.equal((await move("kitchen", { status: "delivered" })).status, 400, "no skipping steps");
    assert.equal((await move("kitchen", { status: "declined" })).status, 400, "declining needs a reason");
    assert.equal((await move("kitchen", { status: "accepted" })).status, 200);
    assert.equal((await move("kitchen", { status: "preparing" })).status, 200);
    const stored = (await database.db.query<{ status: string; accepted_by: string; status_history: unknown[] }>("SELECT status, accepted_by, status_history FROM menu_orders")).rows[0];
    assert.equal(stored.status, "preparing");
    assert.equal(stored.accepted_by, "kitchen");
    assert.equal(stored.status_history.length, 2);
    const entries = (await audit()).filter((item) => item.action === "menu_order.status_changed");
    assert.equal(entries.length, 2);
    const detail = await adminStore.getAudit(entries[0].id);
    assert.equal(JSON.stringify(detail).includes("9876543210"), false);
  });

  test("media: type sniffing, size limit, alt + provenance, re-encoding, truthful assignment", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    assert.equal(sniffImageFormat(svg), null);
    const png = new Uint8Array(await sharp({ create: { width: 64, height: 48, channels: 3, background: "#336699" } }).png().toBuffer());
    assert.equal(sniffImageFormat(png), "png");

    const upload = (user: string, bytes: Uint8Array, fields: Record<string, string>, type = "image/png") => {
      const form = new FormData();
      form.set("file", new Blob([bytes], { type }), "upload.png");
      for (const [name, value] of Object.entries(fields)) form.set(name, value);
      return mediaRoute.POST(request("POST", "/api/admin/media", { cookie: as(user), form }));
    };
    const svgResponse = await upload("manager", svg, { alt: "Logo", provenance: "tejjora" }, "image/png");
    assert.equal(svgResponse.status, 400);
    assert.match((await json(svgResponse)).error!.message, /SVG/);
    assert.equal((await upload("manager", new TextEncoder().encode("not an image at all"), { alt: "x", provenance: "tejjora" })).status, 400);
    assert.equal((await upload("manager", png, { provenance: "tejjora" })).status, 400, "alt text required");
    assert.equal((await upload("manager", png, { alt: "Lobby" })).status, 400, "provenance required");
    assert.equal((await upload("manager", png, { alt: "Lobby", provenance: "licensed" })).status, 400, "licence required");
    assert.equal((await upload("desk", png, { alt: "Lobby", provenance: "tejjora" })).status, 403);
    const big = new Uint8Array(MEDIA_MAX_BYTES + 1);
    big.set(png);
    assert.equal((await upload("manager", big, { alt: "Big", provenance: "tejjora" })).status, 413);

    const ok = await upload("manager", png, { alt: "Lobby seating", provenance: "tejjora", credit: "Tejjora Lake View" });
    assert.equal(ok.status, 201);
    const row = (await json(ok)).row as Record<string, unknown>;
    assert.equal(row.width, 64);
    assert.equal(row.height, 48);
    assert.match(String(row.storage_path), /^\/uploads\/media\/[0-9a-f-]{36}\.webp$/);
    const stored = (await database.db.query<{ blur_data: string }>("SELECT blur_data FROM media_assets WHERE id = $1", [row.id])).rows[0];
    assert.match(stored.blur_data, /^data:image\/webp;base64,/);
    assert.ok((await audit()).some((item) => item.action === "media_asset.uploaded" && item.entityId === row.id));

    const link = (body: unknown) => linksRoute.POST(request("POST", "/api/admin/media/links", { cookie: as("manager"), body }));
    assert.equal((await link({ media_id: row.id, entity_type: "room", entity_id: "deluxe", role: "gallery", sort_order: 0 })).status, 200);
    assert.ok((await getRooms()).data.find((room) => room.id === "deluxe")!.imageSet.includes(String(row.storage_path)));
    const illustrative = (await database.db.query<{ id: string }>("SELECT id FROM media_assets WHERE provenance = 'illustrative' LIMIT 1")).rows[0];
    const refused = await link({ media_id: illustrative.id, entity_type: "gallery", entity_id: "hotel" });
    assert.equal(refused.status, 400);
    assert.match((await json(refused)).error!.fields!.media_id, /illustrative/);
    assert.equal((await patch("manager", "media", illustrative.id, { provenance: "tejjora" })).status, 400, "only the owner may reclassify");
  });

  test("AI knowledge: only public + approved entries reach the getter; edits withdraw approval", async () => {
    const created = await json(await create("manager", "ai-knowledge", { topic: "arrival", question: "Is there parking?", answer: "Yes, on site.", public: true }));
    const id = String((created.row as Record<string, unknown>).id);
    const preview = async (q = "") => json(await previewRoute.GET(request("GET", `/api/admin/ai-knowledge/preview?q=${encodeURIComponent(q)}`, { cookie: as("manager") })));
    assert.equal((await preview()).total, 0, "public but unapproved is not usable");
    assert.equal((await patch("manager", "ai-knowledge", id, { approved: true })).status, 200);
    assert.deepEqual(revalidated.at(-1), ["tejjora:ai-knowledge"]);
    const matched = await preview("parking available?");
    assert.equal((matched.matches as unknown[]).length, 1);
    assert.equal((await getApprovedAiKnowledge()).data.length, 1);
    assert.equal((await patch("manager", "ai-knowledge", id, { public: false })).status, 200);
    assert.equal((await getApprovedAiKnowledge()).data.length, 0, "private entries are excluded");
    await patch("manager", "ai-knowledge", id, { public: true });
    assert.equal((await getApprovedAiKnowledge()).data.length, 1);
    await patch("manager", "ai-knowledge", id, { answer: "Yes, free parking on site." });
    assert.equal((await getApprovedAiKnowledge()).data.length, 0, "a changed answer needs approval again");
    assert.equal((await previewRoute.GET(request("GET", "/api/admin/ai-knowledge/preview", { cookie: as("kitchen") }))).status, 403);
  });

  test("virtual tour: provenance and ready rules; the demo scene stays labelled", async () => {
    const demo = (await getReadyTourScenes()).data.find((scene) => scene.slug === "demo-room")!;
    assert.equal(demo.provenance, "placeholder");
    assert.equal(demo.isPropertyMedia, false);
    const relabel = await patch("manager", "tour-scenes", demo.id, { label: "Deluxe room" });
    assert.equal(relabel.status, 400);
    assert.match((await json(relabel)).error!.fields!.label, /demo or placeholder/);
    const reclassify = await patch("manager", "tour-scenes", demo.id, { provenance: "tejjora" });
    assert.equal(reclassify.status, 400, "only the owner may reclassify a demo/placeholder scene as property media");
    assert.match((await json(reclassify)).error!.fields!.provenance, /owner/);

    const fresh = await json(await create("manager", "tour-scenes", { slug: "terrace-test", label: "Terrace", provenance: "tejjora" }));
    const freshReady = await patch("manager", "tour-scenes", String((fresh.row as Record<string, unknown>).id), { ready: true });
    assert.equal(freshReady.status, 400, "ready needs a panorama");
    assert.match((await json(freshReady)).error!.fields!.ready, /panorama/);
    const pending = (await database.db.query<{ id: string }>("SELECT id FROM tour_scenes WHERE NOT ready ORDER BY sort_order LIMIT 1")).rows[0];
    assert.equal((await patch("manager", "tour-scenes", pending.id, { ready: true })).status, 400, "a placeholder scene must be labelled before it can be ready");
    const placeholderMedia = (await database.db.query<{ id: string }>("SELECT id FROM media_assets WHERE provenance = 'placeholder' LIMIT 1")).rows[0];
    const mismatch = await patch("owner", "tour-scenes", pending.id, { media_id: placeholderMedia.id, provenance: "tejjora" });
    assert.equal(mismatch.status, 400);
    assert.match((await json(mismatch)).error!.fields!.provenance, /placeholder/);
    assert.equal((await patch("owner", "tour-scenes", pending.id, { panorama_path: "/panoramas/lobby.jpg", provenance: "tejjora", ready: true, initial_fov: 1.4 })).status, 200);
    const ready = (await getReadyTourScenes()).data.find((scene) => scene.id === pending.id)!;
    assert.equal(ready.isPropertyMedia, true);
    assert.equal(ready.initialView.fov, 1.4);
    assert.equal((await create("manager", "tour-hotspots", { scene_id: pending.id, label: "Go", yaw: 0, pitch: 0, target_type: "scene", target_value: "no-such-scene" })).status, 400);
    assert.equal((await create("manager", "tour-hotspots", { scene_id: pending.id, label: "Book", yaw: 0, pitch: 0, target_type: "url", target_value: "javascript:alert(1)" })).status, 400);
    assert.equal((await create("manager", "tour-hotspots", { scene_id: pending.id, label: "Book", yaw: 0.2, pitch: 0, target_type: "booking", target_value: "premium" })).status, 201);
  });

  test("SEO: valid paths only, no rating claims, property share images only", async () => {
    assert.equal((await create("manager", "seo", { path: "/admin", title: "x" })).status, 400);
    const rated = await create("manager", "seo", { path: "/rooms", title: "Rooms rated 4.9/5 by guests" });
    assert.equal(rated.status, 400);
    assert.match((await json(rated)).error!.fields!.title, /rating/);
    const placeholderMedia = (await database.db.query<{ id: string }>("SELECT id FROM media_assets WHERE provenance = 'placeholder' LIMIT 1")).rows[0];
    assert.equal((await create("manager", "seo", { path: "/rooms", og_media_id: placeholderMedia.id })).status, 400);
    assert.equal((await create("manager", "seo", { path: "/rooms", title: "Rooms in Gomti Nagar", noindex: false })).status, 201);
    assert.deepEqual(revalidated.at(-1), ["tejjora:seo"]);
    assert.equal((await getSeoPage("/rooms")).data?.title, "Rooms in Gomti Nagar");
    assert.equal((await create("desk", "seo", { path: "/gallery", title: "x" })).status, 403);
  });

  test("without a database the CMS fails closed with a clear, sanitized message", async () => {
    setContentDatabaseForTests(null);
    try {
      const response = await list("manager", "rooms");
      assert.equal(response.status, 503);
      const body = await json(response);
      assert.equal(body.error!.code, "CMS_UNAVAILABLE");
      assert.doesNotMatch(body.error!.message, /postgres:\/\/|password|stack/i);
    } finally {
      setContentDatabaseForTests(database.db);
    }
  });

  test("staff & sessions: owner sees and ends a single session; others cannot", async () => {
    resetMemoryRateLimits();
    const second = await login("desk");
    const staff = await json(await staffRoute.GET(request("GET", "/api/admin/staff", { cookie: as("owner") })));
    const desk = (staff.users as Array<{ id: string; sessions: Array<{ handle: string; current: boolean }> }>).find((user) => user.id === "desk")!;
    assert.equal(desk.sessions.length, 2);
    assert.ok(desk.sessions.every((session) => /^[0-9a-f]{16}$/.test(session.handle)));
    const ownerRow = (staff.users as Array<{ id: string; sessions: Array<{ current: boolean }> }>).find((user) => user.id === "owner")!;
    assert.ok(ownerRow.sessions.some((session) => session.current));
    assert.equal(JSON.stringify(staff).includes("passwordHash"), false);

    const revokeOne = (user: string, body: unknown) => staffSessionsRoute.POST(request("POST", "/api/admin/staff/sessions", { cookie: as(user), body }));
    assert.equal((await revokeOne("manager", { userId: "desk", handle: desk.sessions[0].handle })).status, 403);
    assert.equal((await revokeOne("owner", { userId: "desk", handle: "0000000000000000" })).status, 404);
    // Find which handle belongs to the new session: revoke the other one and check both cookies.
    assert.equal((await revokeOne("owner", { userId: "desk", handle: desk.sessions[0].handle })).status, 200);
    const statuses = await Promise.all([as("desk"), second].map(async (cookie) => (await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie }))).status));
    assert.deepEqual([...statuses].sort(), [200, 401], "exactly one desk session ended");
    assert.ok((await audit()).some((item) => item.action === "admin_user.session_revoked" && item.entityId === "desk"));
  });
});
