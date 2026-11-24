import { strict as assert } from "node:assert";
import { randomBytes, scryptSync } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { isolateEnv, setEnv } from "./setup/env.mts";
import { createTestDatabase, type TestDatabase } from "./setup/pglite.mts";

// Phase 6: restaurant request-to-order. Runs against a disposable, migrated and seeded PGlite
// database routed through the production content path, never DATABASE_URL.
const BASE = "http://localhost:3000";
const hash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
};
const USERS = [
  { id: "owner", name: "Hotel Owner", role: "owner", passwordHash: hash("owner-pass-123") },
  { id: "desk", name: "Front Desk", role: "front_desk", passwordHash: hash("desk-pass-123") },
  { id: "kitchen", name: "Kitchen", role: "kitchen", passwordHash: hash("kitchen-pass-123") },
];
isolateEnv({ ADMIN_USERS_JSON: JSON.stringify(USERS), ADMIN_SESSION_SECRET: randomBytes(32).toString("hex") });

const { memoryAdminPersistence, setAdminPersistenceForTests } = await import("../src/lib/admin/persistence");
const { resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const { setContentDatabaseForTests } = await import("../src/lib/content/db");
const { setRevalidateSpyForTests } = await import("../src/lib/content/revalidate");
const { resetContentCircuit } = await import("../src/lib/content/source");
const { placeOrder, lookupOrder, OrderInputError } = await import("../src/lib/restaurant/orders");
const { orderingWindow, serviceChargePaise } = await import("../src/lib/restaurant/rules");
const ordersRoute = await import("../src/app/api/orders/route");
const lookupRoute = await import("../src/app/api/orders/lookup/route");
const loginRoute = await import("../src/app/api/admin/auth/login/route");
const adminOrdersRoute = await import("../src/app/api/admin/restaurant/orders/route");
const adminOrderRoute = await import("../src/app/api/admin/restaurant/orders/[reference]/route");
const cmsItemRoute = await import("../src/app/api/admin/cms/[resource]/[key]/route");
const { getRestaurantMenu } = await import("../src/lib/content/restaurant");

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let database: TestDatabase;
let adminStore: ReturnType<typeof memoryAdminPersistence>;
let revalidated: string[][] = [];
const cookies: Record<string, string> = {};
const EVENING = new Date("2026-10-05T14:30:00Z"); // 20:00 in India
const LATE = new Date("2026-10-05T17:30:00Z"); // 23:00 in India
const PHONE = "98765 43210";

function request(method: string, pathname: string, { cookie, body }: { cookie?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { origin: BASE };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${BASE}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const json = async (response: Response) => (await response.json()) as Json;
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });

async function login(user: string) {
  const response = await loginRoute.POST(request("POST", "/api/admin/auth/login", { body: { userId: user, password: `${user}-pass-123` } }));
  assert.equal(response.status, 200);
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

type Pick = { id: string; name: string; price: number; half: number | null; variants: string[] };
async function items() {
  const rows = (await database.db.query<{ id: string; name: string; price_full: string; price_half: string | null; variants: string[]; available: boolean }>(
    "SELECT id, name, price_full::text, price_half::text, variants, available FROM menu_items WHERE published ORDER BY id",
  )).rows;
  const map = (row: (typeof rows)[number]): Pick => ({ id: row.id, name: row.name, price: Number(row.price_full), half: row.price_half === null ? null : Number(row.price_half), variants: row.variants });
  const plain = rows.find((row) => row.available && row.variants.length === 0 && row.price_half === null)!;
  const second = rows.filter((row) => row.available && row.variants.length === 0 && row.price_half === null)[1]!;
  const withVariants = rows.find((row) => row.available && row.variants.length > 1);
  return { plain: map(plain), second: map(second), withVariants: withVariants ? map(withVariants) : null };
}

const baseOrder = (lines: unknown[], extra: Record<string, unknown> = {}) => ({ guestName: "Rahul Sharma", phone: PHONE, roomNumber: "204", acknowledged: true, lines, ...extra });
const enableOrdering = (extra = "") => database.db.query(`UPDATE restaurant_settings SET ordering_enabled = true, opening_time = NULL${extra} WHERE id = 1`);

before(async () => {
  database = await createTestDatabase({ seed: true });
  setContentDatabaseForTests(database.db);
  adminStore = memoryAdminPersistence();
  setAdminPersistenceForTests(adminStore);
  setRevalidateSpyForTests((tags) => void revalidated.push(tags));
  setEnv({ NODE_ENV: "test" });
  for (const user of ["owner", "desk", "kitchen"]) {
    resetMemoryRateLimits();
    cookies[user] = await login(user);
  }
});
after(async () => {
  setContentDatabaseForTests(null);
  setAdminPersistenceForTests(null);
  setRevalidateSpyForTests(null);
  await database.close();
});
beforeEach(() => {
  resetMemoryRateLimits();
  resetContentCircuit();
  revalidated = [];
});

describe("ordering rules", () => {
  test("window: admin switch and optional opening time", () => {
    const base = { orderingEnabled: true, openingTime: null };
    assert.equal(orderingWindow({ ...base, orderingEnabled: false }, EVENING).open, false);
    assert.equal(orderingWindow(base, EVENING).open, true);
    assert.equal(orderingWindow(base, LATE).open, true, "no cut-off time: only the switch applies");
    assert.equal(orderingWindow({ ...base, openingTime: "07:00" }, new Date("2026-10-05T00:30:00Z")).open, false, "06:00 before a confirmed opening");
  });

  test("service charge rounds in paise", () => {
    assert.equal(serviceChargePaise(28_000, 5), 1_400);
    assert.equal(serviceChargePaise(10_030, 5), 502);
    assert.equal(serviceChargePaise(10_000, null), 0);
  });
});

describe("placing an order", () => {
  test("refused while the admin switch is off (the seeded default)", async () => {
    const { plain } = await items();
    await assert.rejects(placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 1 }]), { now: EVENING }), (error: Error) => error instanceof OrderInputError && error.code === "ORDERING_CLOSED");
  });

  test("server prices from the database, adds 5% service, ignores client prices, writes an atomic order", async () => {
    await enableOrdering();
    const { plain, second } = await items();
    const placed = await placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 2, price: 1 }, { itemId: second.id, qty: 1, unitPrice: 1 }]), { now: EVENING });
    assert.match(placed.reference, /^TLO-[0-9A-HJKMNP-TV-Z]{10}$/);
    assert.equal(placed.status, "requested");
    const subtotal = plain.price * 2 + second.price;
    assert.equal(placed.subtotal, subtotal);
    assert.equal(placed.serviceCharge, Math.round(subtotal * 5) / 100);
    assert.equal(placed.totalExclTax, placed.subtotal + placed.serviceCharge);
    const stored = (await database.db.query<Json>("SELECT * FROM menu_orders WHERE reference = $1", [placed.reference])).rows[0];
    assert.equal(stored.phone_e164, "+919876543210");
    assert.equal(stored.room_number, "204");
    assert.equal(stored.status, "requested");
    assert.equal((await database.db.query("SELECT 1 FROM menu_order_items WHERE order_id = $1", [stored.id])).rows.length, 2);
    const audit = (await adminStore.listAudit({}, 50, 0)).items.find((entry) => entry.action === "menu_order.placed");
    assert.ok(audit, "placement is audited");
    assert.ok(!JSON.stringify(audit).includes("9876543210") && !JSON.stringify(audit).includes("Rahul"), "audit carries no guest name or phone");
    assert.deepEqual(revalidated, [], "placing an order invalidates no content cache");
  });

  test("closed before the opening time; rejects unavailable, unknown, bad variants, bad quantity, missing acknowledgement, changed prices", async () => {
    await enableOrdering();
    const { plain, withVariants } = await items();
    const code = async (body: unknown, now = EVENING) => {
      try {
        await placeOrder(database.db, body, { now });
        return "ok";
      } catch (error) {
        return error instanceof OrderInputError ? error.code : String(error);
      }
    };
    await database.db.query("UPDATE restaurant_settings SET opening_time = '07:00' WHERE id = 1");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1 }]), new Date("2026-10-05T00:30:00Z")), "ORDERING_CLOSED");
    await enableOrdering();
    assert.equal(await code(baseOrder([{ itemId: "no-such-dish", qty: 1 }])), "ITEM_UNKNOWN");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 0 }])), "INVALID_ORDER");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 99 }])), "INVALID_ORDER");
    assert.equal(await code(baseOrder([])), "INVALID_ORDER");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1, variant: "Extra" }])), "INVALID_ORDER", "variant on a dish without options");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1, size: "half" }])), "INVALID_ORDER", "no invented half price");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1 }], { acknowledged: false })), "ACK_REQUIRED");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1 }], { phone: "123" })), "INVALID_ORDER");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1 }], { guestName: "  " })), "INVALID_ORDER");
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1 }], { expectedTotal: 1 })), "PRICE_CHANGED");
    if (withVariants) {
      assert.equal(await code(baseOrder([{ itemId: withVariants.id, qty: 1 }])), "INVALID_ORDER", "an option is required");
      assert.equal(await code(baseOrder([{ itemId: withVariants.id, qty: 1, variant: withVariants.variants[0] }])), "ok");
    }
    await database.db.query("UPDATE menu_items SET available = false WHERE id = $1", [plain.id]);
    assert.equal(await code(baseOrder([{ itemId: plain.id, qty: 1 }])), "ITEM_UNAVAILABLE");
    await database.db.query("UPDATE menu_items SET available = true WHERE id = $1", [plain.id]);
  });

  test("order route: validation, rate limits per client and per mobile, no raw errors", async () => {
    await enableOrdering();
    const { plain } = await items();
    const post = (body: unknown) => ordersRoute.POST(request("POST", "/api/orders", { body }));
    assert.equal((await post(baseOrder([{ itemId: plain.id, qty: 1 }]))).status, 201);
    const bad = await post(baseOrder([{ itemId: "no-such-dish", qty: 1 }]));
    assert.equal(bad.status, 409);
    assert.ok(!/select|insert|menu_items/i.test(JSON.stringify(await json(bad))));
    const crossSite = new Request(`${BASE}/api/orders`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
    assert.equal((await ordersRoute.POST(crossSite)).status, 403);
    // 4 per mobile per hour (the rejected request above also counted): two more succeed, the next is limited.
    for (let index = 0; index < 2; index += 1) assert.equal((await post(baseOrder([{ itemId: plain.id, qty: 1 }]))).status, 201);
    assert.equal((await post(baseOrder([{ itemId: plain.id, qty: 1 }]))).status, 429);
  });

  test("the whole order is atomic: a failing line writes nothing", async () => {
    await enableOrdering();
    const { plain } = await items();
    const before = (await database.db.query<{ n: number }>("SELECT count(*)::int AS n FROM menu_orders")).rows[0].n;
    await assert.rejects(placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 1 }, { itemId: "no-such-dish", qty: 1 }]), { now: EVENING }));
    assert.equal((await database.db.query<{ n: number }>("SELECT count(*)::int AS n FROM menu_orders")).rows[0].n, before);
  });
});

describe("guest order status", () => {
  test("reference + mobile only; every failure is the same generic 404; limits apply", async () => {
    await enableOrdering();
    const { plain } = await items();
    const placed = await placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 1 }]), { now: EVENING });
    const view = await lookupOrder(database.db, placed.reference.toLowerCase(), "+91 98765-43210");
    assert.ok(view);
    assert.equal(view!.guestNameMasked, "R. S****");
    assert.equal(view!.phoneLast4, "3210");
    assert.ok(!JSON.stringify(view).includes("9876543210"));
    assert.equal(await lookupOrder(database.db, placed.reference, "9999999999"), null);
    assert.equal(await lookupOrder(database.db, "TLO-AAAAAAAAAA", PHONE), null);

    const post = (body: unknown) => lookupRoute.POST(request("POST", "/api/orders/lookup", { body }));
    const ok = await post({ reference: placed.reference, phone: PHONE });
    assert.equal(ok.status, 200);
    const wrong = await post({ reference: placed.reference, phone: "9000000000" });
    const unknown = await post({ reference: "TLO-AAAAAAAAAA", phone: PHONE });
    const malformed = await post({ reference: "nonsense", phone: "x" });
    for (const response of [wrong, unknown, malformed]) assert.equal(response.status, 404);
    const bodies = await Promise.all([wrong, unknown, malformed].map(json));
    assert.deepEqual(bodies[0], bodies[1]);
    assert.deepEqual(bodies[1], bodies[2]);
  });

  test("lifecycle seen by the guest follows the kitchen: requested → accepted → preparing → ready → delivered; declines carry a reason", async () => {
    await enableOrdering();
    const { plain } = await items();
    const placed = await placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 1 }]), { now: EVENING });
    const move = (user: string, reference: string, body: unknown) =>
      adminOrderRoute.PATCH(request("PATCH", `/api/admin/restaurant/orders/${reference}`, { cookie: cookies[user], body }), params({ reference }));

    assert.equal((await adminOrdersRoute.GET(request("GET", "/api/admin/restaurant/orders", { cookie: cookies.desk }))).status, 200);
    assert.equal((await move("desk", placed.reference, { status: "accepted" })).status, 403, "front desk can view but not change");
    assert.equal((await move("kitchen", placed.reference, { status: "ready" })).status, 400, "no skipping steps");
    for (const status of ["accepted", "preparing", "ready", "delivered"]) {
      assert.equal((await move("kitchen", placed.reference, { status })).status, 200, status);
      assert.equal((await lookupOrder(database.db, placed.reference, PHONE))!.status, status);
    }
    assert.equal((await move("kitchen", placed.reference, { status: "preparing" })).status, 400, "delivered is final");

    const second = await placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 1 }]), { now: EVENING });
    assert.equal((await move("kitchen", second.reference, { status: "declined" })).status, 400, "a reason is required");
    assert.equal((await move("owner", second.reference, { status: "declined", reason: "Kitchen is closing early" })).status, 200);
    const declined = await lookupOrder(database.db, second.reference, PHONE);
    assert.equal(declined!.status, "declined");
    assert.equal(declined!.declineReason, "Kitchen is closing early");
    assert.ok(!JSON.stringify(declined).includes("kitchen\""), "staff ids are not exposed to the guest");

    const audits = (await adminStore.listAudit({}, 100, 0)).items.filter((entry) => entry.action === "menu_order.status_changed");
    assert.ok(audits.length >= 5, "every status change is audited");
    assert.deepEqual(revalidated, [], "order moves invalidate no content cache");
  });
});

describe("menu availability reaches ordering", () => {
  test("kitchen marks a dish unavailable: the cache tag is invalidated and new orders for it are refused", async () => {
    await enableOrdering();
    const { plain } = await items();
    const response = await cmsItemRoute.PATCH(
      request("PATCH", `/api/admin/cms/menu-items/${plain.id}`, { cookie: cookies.kitchen, body: { available: false } }),
      params({ resource: "menu-items", key: plain.id }),
    );
    assert.equal(response.status, 200);
    assert.ok(revalidated.flat().some((tag) => tag.includes("menu")), "menu tag invalidated");
    const { data } = await getRestaurantMenu();
    assert.equal(data.flatMap((category) => category.items).find((item) => item.id === plain.id)?.available, false);
    await assert.rejects(placeOrder(database.db, baseOrder([{ itemId: plain.id, qty: 1 }]), { now: EVENING }), (error: Error) => error instanceof OrderInputError && error.code === "ITEM_UNAVAILABLE");
  });
});
