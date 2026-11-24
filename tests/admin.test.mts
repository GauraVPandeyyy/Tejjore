import { strict as assert } from "node:assert";
import { randomBytes, scryptSync } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, test } from "node:test";
import { isolateEnv, makeReservation, setEnv } from "./setup/env.mts";
import { createTestDatabase } from "./setup/pglite.mts";

// Phase 3A: staff identity, roles, revocable sessions and the audit trail. Everything runs in
// the isolated env (no DATABASE_URL); the PostgreSQL store is exercised against PGlite.
const BASE = "http://localhost:3000";
const hash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
};
const PASSWORDS = { owner: "owner-pass-123", manager: "manager-pass-123", desk: "desk-pass-123", kitchen: "kitchen-pass-123", legacy: "legacy-pass-123" };
const USERS = [
  { id: "owner", name: "Hotel Owner", role: "owner", passwordHash: hash(PASSWORDS.owner) },
  { id: "manager", name: "Duty Manager", role: "manager", passwordHash: hash(PASSWORDS.manager) },
  { id: "desk", name: "Front Desk", role: "front_desk", passwordHash: hash(PASSWORDS.desk) },
  { id: "kitchen", name: "Kitchen", role: "kitchen", passwordHash: hash(PASSWORDS.kitchen) },
  { id: "legacy", name: "Pre-3A Account", passwordHash: hash(PASSWORDS.legacy) },
  { id: "typo", name: "Bad Role", role: "superuser", passwordHash: hash("whatever-123") },
];
const usersJson = JSON.stringify(USERS);
const { storePath } = isolateEnv({ ADMIN_USERS_JSON: usersJson, ADMIN_SESSION_SECRET: randomBytes(32).toString("hex") });

const { authenticateAdmin, findAdminUser } = await import("../src/lib/admin/auth");
const { ADMIN_PERMISSIONS, permissionsForRole, roleHasPermission } = await import("../src/lib/admin/permissions");
const { memoryAdminPersistence, postgresAdminPersistence, setAdminPersistenceForTests, adminPersistence } = await import("../src/lib/admin/persistence");
const { resolveSession, sessionKeyFor, startSession, SESSION_TTL_SECONDS, SESSION_IDLE_SECONDS } = await import("../src/lib/admin/session");
const { sanitizeAuditDiff, recordAudit } = await import("../src/lib/admin/audit");
const { resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const loginRoute = await import("../src/app/api/admin/auth/login/route");
const logoutRoute = await import("../src/app/api/admin/auth/logout/route");
const logoutAllRoute = await import("../src/app/api/admin/auth/logout-all/route");
const overviewRoute = await import("../src/app/api/admin/overview/route");
const reservationsRoute = await import("../src/app/api/admin/reservations/route");
const reservationRoute = await import("../src/app/api/admin/reservations/[reference]/route");
const paymentsRoute = await import("../src/app/api/admin/payments/route");
const inventoryRoute = await import("../src/app/api/admin/inventory/route");
const blocksRoute = await import("../src/app/api/admin/inventory/blocks/route");
const roomsRoute = await import("../src/app/api/admin/rooms/[roomId]/route");
const auditRoute = await import("../src/app/api/admin/audit/route");
const auditEntryRoute = await import("../src/app/api/admin/audit/[id]/route");
const staffRoute = await import("../src/app/api/admin/staff/route");
const staffSessionsRoute = await import("../src/app/api/admin/staff/sessions/route");

type Store = ReturnType<typeof memoryAdminPersistence>;
let store: Store;

function request(method: string, pathname: string, { cookie, body, origin = BASE }: { cookie?: string; body?: unknown; origin?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${BASE}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });
const cookieFrom = (response: Response) => (response.headers.get("set-cookie") ?? "").split(";")[0];

async function login(userId: keyof typeof PASSWORDS | string, password?: string, cookie?: string) {
  const response = await loginRoute.POST(request("POST", "/api/admin/auth/login", { body: { userId, password: password ?? PASSWORDS[userId as keyof typeof PASSWORDS] }, cookie }));
  return { response, cookie: cookieFrom(response) };
}
async function body(response: Response) {
  return response.json() as Promise<Record<string, unknown> & { error?: { code: string; message: string } }>;
}
function writeBookingStore(reservations = [makeReservation()], blocks: unknown[] = []) {
  writeFileSync(storePath, JSON.stringify({ reservations, blocks, processedWebhookIds: [] }));
}
async function auditEntries() {
  return (await store.listAudit({}, 500, 0)).items;
}

beforeEach(() => {
  store = memoryAdminPersistence();
  setAdminPersistenceForTests(store);
  resetMemoryRateLimits();
  setEnv({ ADMIN_USERS_JSON: usersJson, NODE_ENV: "test" });
  writeBookingStore();
});

describe("authentication", () => {
  test("hashed accounts sign in; roles come from ADMIN_USERS_JSON; hashes never leave the server", async () => {
    const { response, cookie } = await login("owner");
    assert.equal(response.status, 200);
    const payload = await body(response);
    assert.deepEqual(payload.user, { id: "owner", name: "Hotel Owner", role: "owner" });
    assert.ok(!JSON.stringify(payload).includes("scrypt$"));
    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    assert.match(cookie, /^tejjora_admin_session=v1\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
  });

  test("wrong password and unknown user get the same generic answer", async () => {
    const wrong = await login("owner", "not-the-password");
    const unknown = await login("nobody-here", "whatever");
    assert.equal(wrong.response.status, 401);
    assert.equal(unknown.response.status, 401);
    assert.deepEqual(await body(wrong.response), await body(unknown.response));
    assert.equal(wrong.cookie, "");
  });

  test("role parsing: missing role → manager (never owner); unknown role → account ignored", () => {
    assert.equal(findAdminUser("legacy")?.role, "manager");
    assert.equal(findAdminUser("typo"), null);
    assert.equal(authenticateAdmin("typo", "whatever-123"), null);
  });

  test("plain-text ADMIN_PASSWORD is refused in production", () => {
    setEnv({ ADMIN_USER_ID: "plain", ADMIN_PASSWORD: "plain-pass", NODE_ENV: "production" });
    try {
      assert.equal(authenticateAdmin("plain", "plain-pass"), null);
    } finally {
      setEnv({ ADMIN_USER_ID: undefined, ADMIN_PASSWORD: undefined, NODE_ENV: "test" });
    }
  });

  test("lockout: the shared rate limiter stops repeated attempts with a generic message", async () => {
    let last: Response | null = null;
    for (let attempt = 0; attempt < 11; attempt += 1) last = (await login("owner", "wrong-password")).response;
    assert.equal(last?.status, 429);
    assert.match((await body(last!)).error!.message, /Too many sign-in attempts/);
  });
});

describe("revocable sessions", () => {
  test("login creates a server session keyed by a hash of a 256-bit token (never the token)", async () => {
    const first = await login("owner");
    const second = await login("owner");
    assert.notEqual(first.cookie, second.cookie);
    const token = first.cookie.split("=")[1].split(".")[1];
    const record = await store.findSession(sessionKeyFor(token));
    assert.ok(record);
    assert.equal(record.userId, "owner");
    assert.equal(record.role, "owner");
    assert.notEqual(record.id, token);
    assert.equal(await store.findSession(token), null);
  });

  test("the current session authorises; logout revokes it immediately", async () => {
    const { cookie } = await login("manager");
    assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie }))).status, 200);
    const out = await logoutRoute.POST(request("POST", "/api/admin/auth/logout", { cookie }));
    assert.equal(out.status, 200);
    assert.match(out.headers.get("set-cookie") ?? "", /Max-Age=0/i);
    const reused = await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie }));
    assert.equal(reused.status, 401);
    assert.equal((await body(reused)).error?.code, "SESSION_ENDED");
  });

  test("expired and idle sessions are rejected", async () => {
    const created = await startSession({ id: "owner", name: "Hotel Owner", role: "owner" });
    const now = Date.now();
    assert.equal((await resolveSession(created.cookieValue, new Date(now))).ok, true);
    const pastExpiry = await resolveSession(created.cookieValue, new Date(now + SESSION_TTL_SECONDS * 1000 + 1000));
    assert.deepEqual(pastExpiry, { ok: false, reason: "expired" });
    const idle = await startSession({ id: "owner", name: "Hotel Owner", role: "owner" });
    assert.deepEqual(await resolveSession(idle.cookieValue, new Date(now + SESSION_IDLE_SECONDS * 1000 + 1000)), { ok: false, reason: "expired" });
  });

  test("log out everywhere revokes every session of that account only", async () => {
    const laptop = await login("desk");
    const phone = await login("desk");
    const other = await login("manager");
    const result = await logoutAllRoute.POST(request("POST", "/api/admin/auth/logout-all", { cookie: laptop.cookie }));
    assert.equal(result.status, 200);
    assert.equal((await body(result)).revoked, 2);
    for (const cookie of [laptop.cookie, phone.cookie]) {
      assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie }))).status, 401);
    }
    assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie: other.cookie }))).status, 200);
  });

  test("modified, forged or fixated cookies never authorise", async () => {
    const { cookie } = await login("owner");
    const [name, value] = cookie.split("=");
    const [version, token, signature] = value.split(".");
    const flipped = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    for (const forged of [`${name}=${version}.${flipped}.${signature}`, `${name}=${version}.${token}.${signature.slice(0, -1)}x`, `${name}=garbage`, `${name}=v1.${randomBytes(32).toString("base64url")}.${signature}`]) {
      const response = await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie: forged }));
      assert.equal(response.status, 401, forged.slice(0, 40));
    }
    // Signing in while presenting an existing cookie revokes it and issues a fresh session.
    const relogin = await login("owner", undefined, cookie);
    assert.notEqual(relogin.cookie, cookie);
    assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie }))).status, 401);
    assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie: relogin.cookie }))).status, 200);
  });

  test("role tampering is impossible: role is re-read from configuration; a changed role ends the session", async () => {
    const { cookie } = await login("desk");
    assert.ok(!decodeURIComponent(cookie).includes("front_desk"), "the cookie carries no role");
    const demoted = USERS.map((user) => (user.id === "desk" ? { ...user, role: "kitchen" } : user));
    setEnv({ ADMIN_USERS_JSON: JSON.stringify(demoted) });
    const response = await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie }));
    assert.equal(response.status, 401);
    assert.equal((await body(response)).error?.code, "SESSION_ENDED");
  });

  test("production without a database: staff sign-in fails closed", async () => {
    setAdminPersistenceForTests(null);
    setEnv({ NODE_ENV: "production", DATABASE_URL: "" });
    try {
      assert.throws(() => adminPersistence(), /DATABASE_URL/);
      const { response } = await login("owner");
      assert.equal(response.status, 503);
      assert.ok(!JSON.stringify(await body(response)).includes("DATABASE_URL"), "no internals in the response");
    } finally {
      setEnv({ NODE_ENV: "test" });
    }
  });
});

describe("roles and permissions", () => {
  test("permission matrix: representative allows and denials per role", () => {
    for (const permission of ADMIN_PERMISSIONS) assert.equal(roleHasPermission("owner", permission), true, `owner ${permission}`);
    const expectations: Array<[string, string, boolean]> = [
      ["manager", "reservations.manage", true], ["manager", "payments.refund", true], ["manager", "audit.view", true],
      ["manager", "content.manage", true], ["manager", "staff.view", false], ["manager", "staff.manage", false],
      ["front_desk", "reservations.view", true], ["front_desk", "reservations.manage", true], ["front_desk", "availability.view", true],
      ["front_desk", "availability.manage", false], ["front_desk", "staff.manage", false], ["front_desk", "audit.view", false],
      ["front_desk", "restaurant.orders.view", true], ["front_desk", "payments.refund", false],
      ["kitchen", "restaurant.orders.manage", true], ["kitchen", "restaurant.menu.availability", true], ["kitchen", "restaurant.menu.manage", false],
      ["kitchen", "reservations.view", false], ["kitchen", "dashboard.view", false], ["kitchen", "payments.view", false],
    ];
    for (const [role, permission, allowed] of expectations) {
      assert.equal(roleHasPermission(role as "owner", permission as "dashboard.view"), allowed, `${role} ${permission}`);
    }
    assert.ok(permissionsForRole("kitchen").every((permission) => permission.startsWith("restaurant.")));
  });

  test("API enforcement: 401 without a session, 403 for the wrong role, 200 for the right one", async () => {
    const cookies = Object.fromEntries(await Promise.all(["owner", "manager", "desk", "kitchen"].map(async (id) => [id, (await login(id)).cookie])));
    const status = async (response: Response | Promise<Response>) => (await response).status;
    assert.equal(await status(reservationsRoute.GET(request("GET", "/api/admin/reservations"))), 401);
    assert.equal(await status(reservationsRoute.GET(request("GET", "/api/admin/reservations", { cookie: cookies.kitchen }))), 403);
    assert.equal(await status(overviewRoute.GET(request("GET", "/api/admin/overview", { cookie: cookies.kitchen }))), 403);
    assert.equal(await status(reservationsRoute.GET(request("GET", "/api/admin/reservations", { cookie: cookies.desk }))), 200);
    assert.equal(await status(roomsRoute.PUT(request("PUT", "/api/admin/rooms/deluxe", { cookie: cookies.desk, body: { baseRate: 2100, totalInventory: 10 } }), params({ roomId: "deluxe" }))), 403);
    assert.equal(await status(staffRoute.GET(request("GET", "/api/admin/staff", { cookie: cookies.desk }))), 403);
    assert.equal(await status(staffRoute.GET(request("GET", "/api/admin/staff", { cookie: cookies.manager }))), 403);
    assert.equal(await status(staffSessionsRoute.POST(request("POST", "/api/admin/staff/sessions", { cookie: cookies.manager, body: { userId: "desk" } }))), 403);
    assert.equal(await status(auditRoute.GET(request("GET", "/api/admin/audit", { cookie: cookies.desk }))), 403);
    assert.equal(await status(auditRoute.GET(request("GET", "/api/admin/audit", { cookie: cookies.manager }))), 200);
    assert.equal(await status(staffRoute.GET(request("GET", "/api/admin/staff", { cookie: cookies.owner }))), 200);
    const revoke = await staffSessionsRoute.POST(request("POST", "/api/admin/staff/sessions", { cookie: cookies.owner, body: { userId: "desk" } }));
    assert.equal(revoke.status, 200);
    assert.equal(await status(reservationsRoute.GET(request("GET", "/api/admin/reservations", { cookie: cookies.desk }))), 401, "owner revoked the desk session");
  });

  test("state-changing admin requests from another origin are refused before authorisation", async () => {
    const { cookie } = await login("owner");
    const crossSite = await blocksRoute.POST(request("POST", "/api/admin/inventory/blocks", { cookie, origin: "https://evil.example", body: { roomId: "deluxe", date: "2027-01-10", quantity: 1 } }));
    assert.equal(crossSite.status, 403);
    assert.equal((await body(crossSite)).error?.code, "CROSS_ORIGIN_FORBIDDEN");
    const noOrigin = await logoutRoute.POST(request("POST", "/api/admin/auth/logout", { cookie, origin: null }));
    assert.equal(noOrigin.status, 403);
  });

  test("every /api/admin handler goes through the central authorisation layer", () => {
    const root = path.resolve(import.meta.dirname, "../src/app/api/admin");
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((name) => (statSync(path.join(dir, name)).isDirectory() ? walk(path.join(dir, name)) : name === "route.ts" && files.push(path.join(dir, name))));
    walk(root);
    assert.ok(files.length >= 14);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const handlers = source.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g) ?? [];
      if (file.endsWith(path.join("auth", "login", "route.ts"))) continue;
      const guarded = source.match(/await authorizeAdmin\(request, /g) ?? [];
      assert.equal(guarded.length, handlers.length, path.relative(root, file));
      assert.doesNotMatch(source, /requireAdminApi|getAdminSession/, path.relative(root, file));
    }
  });
});

describe("audit trail", () => {
  test("sanitizer redacts secrets and contact details at any depth and bounds size", () => {
    const clean = sanitizeAuditDiff({
      password: "p", passwordHash: "scrypt$x", accessTokenHash: "t", sessionToken: "s", razorpaySecret: "r",
      guest: { email: "a@b.test", phone: "+91 98765 43210", firstName: "Asha" },
      note: "x".repeat(500),
      list: Array.from({ length: 50 }, (_, index) => index),
    }) as Record<string, unknown> & { guest: Record<string, unknown>; list: unknown[]; note: string };
    for (const key of ["password", "passwordHash", "accessTokenHash", "sessionToken", "razorpaySecret"]) assert.equal(clean[key], "[redacted]", key);
    assert.equal(clean.guest.email, "[redacted]");
    assert.equal(clean.guest.phone, "[redacted]");
    assert.equal(clean.list.length, 20);
    assert.ok(clean.note.length <= 301);
  });

  test("mutations are audited with actor, role and a safe diff", async () => {
    const { cookie } = await login("manager");
    const update = await roomsRoute.PUT(request("PUT", "/api/admin/rooms/deluxe", { cookie, body: { baseRate: 2200, totalInventory: 10 } }), params({ roomId: "deluxe" }));
    assert.equal(update.status, 200);
    const entry = (await auditEntries()).find((item) => item.action === "room_setting.updated");
    assert.ok(entry);
    assert.equal(entry.actor, "manager");
    assert.equal(entry.role, "manager");
    assert.equal(entry.entityId, "deluxe");
    const detail = await store.getAudit(entry.id);
    assert.deepEqual((detail?.diff as { baseRate: unknown }).baseRate, { from: 2000, to: 2200 });
  });

  test("reservation changes and detail views are audited without guest contact details or notes", async () => {
    const reservation = makeReservation({ status: "confirmed", paymentStatus: "paid", expiresAt: null });
    writeBookingStore([reservation]);
    const { cookie } = await login("desk");
    const view = await reservationRoute.GET(request("GET", `/api/admin/reservations/${reservation.reference}`, { cookie }), params({ reference: reservation.reference }));
    assert.equal(view.status, 200);
    assert.ok(!JSON.stringify(await body(view)).includes("accessTokenHash"));
    const patch = await reservationRoute.PATCH(
      request("PATCH", `/api/admin/reservations/${reservation.reference}`, { cookie, body: { status: "cancelled", staffNotes: "Guest asha@example.test called from +91 98765 43210" } }),
      params({ reference: reservation.reference }),
    );
    assert.equal(patch.status, 200);
    const entries = await auditEntries();
    assert.ok(entries.some((item) => item.action === "reservation.detail_viewed" && item.entityId === reservation.reference));
    const updated = entries.find((item) => item.action === "reservation.updated");
    assert.ok(updated);
    const serialised = JSON.stringify(await store.getAudit(updated.id));
    assert.match(serialised, /"from":"confirmed","to":"cancelled"/);
    assert.match(serialised, /"staffNotesChanged":true/);
    for (const secret of ["asha@example.test", "98765", "Guest asha"]) assert.ok(!serialised.includes(secret), secret);
  });

  test("sign-in events are audited without passwords, hashes, tokens or the typed id of a failure", async () => {
    const { cookie } = await login("owner");
    await login("owner", "typed-wrong-secret");
    await logoutRoute.POST(request("POST", "/api/admin/auth/logout", { cookie }));
    const entries = await auditEntries();
    assert.deepEqual(entries.map((item) => item.action).sort(), ["auth.login", "auth.login_failed", "auth.logout"]);
    const failed = entries.find((item) => item.action === "auth.login_failed");
    assert.equal(failed?.actor, "anonymous");
    const everything = JSON.stringify(await Promise.all(entries.map((item) => store.getAudit(item.id))));
    for (const secret of [PASSWORDS.owner, "typed-wrong-secret", "scrypt$", cookie.split("=")[1]]) assert.ok(!everything.includes(secret));
  });

  test("audit list is paginated, newest first, and the detail endpoint returns the sanitised diff", async () => {
    for (let index = 0; index < 60; index += 1) await recordAudit("system", { action: "test.event", entity: "reservation", entityId: `R${index}` });
    const { cookie } = await login("owner");
    const pageOne = await body(await auditRoute.GET(request("GET", "/api/admin/audit?page=1&pageSize=50&entity=reservation", { cookie })));
    assert.equal((pageOne.items as unknown[]).length, 50);
    assert.equal(pageOne.total, 60);
    assert.equal((pageOne.items as Array<{ entityId: string; diff?: unknown }>)[0].entityId, "R59");
    assert.ok((pageOne.items as Array<{ diff?: unknown }>).every((item) => !("diff" in item)), "the list carries no diffs");
    const pageTwo = await body(await auditRoute.GET(request("GET", "/api/admin/audit?page=2&pageSize=50&entity=reservation", { cookie })));
    assert.equal((pageTwo.items as unknown[]).length, 10);
    const missing = await auditEntryRoute.GET(request("GET", "/api/admin/audit/99999", { cookie }), params({ id: "99999" }));
    assert.equal(missing.status, 404);
  });
});

describe("existing admin workflows (Today, Reservations, Availability & Rates, Payments)", () => {
  test("reservations are paginated masked summaries with server-side search and status filter", async () => {
    const reservations = Array.from({ length: 30 }, (_, index) => makeReservation({
      id: `res-${index}`,
      reference: `TLV-261004-A${String(index).padStart(5, "0")}`,
      createdAt: new Date(Date.now() - index * 60_000).toISOString(),
      guest: { ...makeReservation().guest, phone: `+91 90000 ${String(10000 + index)}`, email: `guest${index}@example.test` },
      status: index % 2 ? "confirmed" : "payment_pending",
    }));
    writeBookingStore(reservations);
    const { cookie } = await login("desk");
    const page1 = await body(await reservationsRoute.GET(request("GET", "/api/admin/reservations?page=1&pageSize=25", { cookie })));
    const page2 = await body(await reservationsRoute.GET(request("GET", "/api/admin/reservations?page=2&pageSize=25", { cookie })));
    assert.equal((page1.items as unknown[]).length, 25);
    assert.equal((page2.items as unknown[]).length, 5);
    assert.equal(page1.total, 30);
    const serialised = JSON.stringify([page1, page2]);
    for (const hidden of ["@example.test", "accessTokenHash", "deadbeef", "90000 1"]) assert.ok(!serialised.includes(hidden), hidden);
    const byPhone = await body(await reservationsRoute.GET(request("GET", "/api/admin/reservations?q=9000010007", { cookie })));
    assert.deepEqual((byPhone.items as Array<{ reference: string }>).map((item) => item.reference), ["TLV-261004-A00007"]);
    const byEmail = await body(await reservationsRoute.GET(request("GET", "/api/admin/reservations?q=guest12%40example.test", { cookie })));
    assert.equal(byEmail.total, 1);
    const confirmed = await body(await reservationsRoute.GET(request("GET", "/api/admin/reservations?status=confirmed&pageSize=100", { cookie })));
    assert.equal(confirmed.total, 15);
    const huge = await body(await reservationsRoute.GET(request("GET", "/api/admin/reservations?pageSize=100000", { cookie })));
    assert.equal(huge.pageSize, 100, "page size is bounded");
  });

  test("Today: metrics plus today's arrivals for desk staff; the overview no longer ships every reservation", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    writeBookingStore([
      makeReservation({ id: "a", reference: "TLV-261004-ARRIVE", status: "confirmed", paymentStatus: "paid", expiresAt: null, stay: { checkIn: today, checkOut: tomorrow, adults: 2, children: 0, rooms: 1 } }),
      makeReservation({ id: "b", reference: "TLV-261004-LATER1" }),
    ]);
    const { cookie } = await login("desk");
    const overview = await body(await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie })));
    assert.equal((overview.metrics as { arrivals: number }).arrivals, 1);
    assert.deepEqual((overview.arrivals as Array<{ reference: string }>).map((item) => item.reference), ["TLV-261004-ARRIVE"]);
    assert.ok(!("reservations" in overview));
    assert.ok(!JSON.stringify(overview).includes("TLV-261004-LATER1"));
  });

  test("Availability: 14-day grid; more than 20 blocks all listed and removable; failures are explicit", async () => {
    const blocks = Array.from({ length: 25 }, (_, index) => ({ id: `block-${index}`, roomId: "premium", date: `2027-03-${String((index % 28) + 1).padStart(2, "0")}`, quantity: 1 }));
    writeBookingStore([], blocks);
    const { cookie } = await login("manager");
    const view = await body(await inventoryRoute.GET(request("GET", "/api/admin/inventory", { cookie })));
    assert.equal(new Set((view.inventory as Array<{ date: string }>).map((item) => item.date)).size, 14);
    assert.equal((view.blocks as unknown[]).length, 25);
    const removed = await blocksRoute.DELETE(request("DELETE", "/api/admin/inventory/blocks?id=block-24", { cookie }));
    assert.equal(removed.status, 200);
    const again = await blocksRoute.DELETE(request("DELETE", "/api/admin/inventory/blocks?id=block-24", { cookie }));
    assert.equal(again.status, 400);
    assert.equal((await body(again)).error?.message, "Inventory block not found.");
    assert.ok((await auditEntries()).some((item) => item.action === "inventory_block.removed" && item.entityId === "block-24"));
  });

  test("Payments: totals plus a bounded page of records", async () => {
    writeBookingStore([makeReservation({ status: "confirmed", paymentStatus: "paid", expiresAt: null, pricing: { ...makeReservation().pricing, amountPaid: 4000, amountDue: 0 } })]);
    const { cookie } = await login("desk");
    const payments = await body(await paymentsRoute.GET(request("GET", "/api/admin/payments", { cookie })));
    assert.deepEqual(payments.metrics, { paid: 1, pending: 0, failed: 0, amountPaid: 4000, outstanding: 0 });
    assert.equal((payments.records as { pageSize: number }).pageSize, 30);
  });
});

describe("PostgreSQL session and audit store (PGlite)", () => {
  test("sessions and audit rows persist, revoke and paginate in the real schema", async () => {
    const database = await createTestDatabase();
    try {
      const pgStore = postgresAdminPersistence((text, values) => database.pg.query(text, values));
      setAdminPersistenceForTests(pgStore);
      const first = await login("owner");
      const second = await login("owner");
      assert.equal(first.response.status, 200);
      const rows = (await database.pg.query<{ id: string; user_id: string; role: string }>("SELECT id, user_id, role FROM admin_sessions")).rows;
      assert.equal(rows.length, 2);
      assert.ok(rows.every((row) => /^[0-9a-f]{64}$/.test(row.id) && row.user_id === "owner" && row.role === "owner"));
      const token = first.cookie.split("=")[1].split(".")[1];
      assert.ok(!rows.some((row) => row.id === token), "the raw token is never stored");
      assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie: second.cookie }))).status, 200);
      await logoutAllRoute.POST(request("POST", "/api/admin/auth/logout-all", { cookie: first.cookie }));
      assert.equal((await overviewRoute.GET(request("GET", "/api/admin/overview", { cookie: second.cookie }))).status, 401);
      const audit = (await database.pg.query<{ action: string; actor: string }>("SELECT action, actor FROM audit_log ORDER BY id")).rows;
      assert.deepEqual(audit.map((row) => row.action), ["auth.login", "auth.login", "auth.logout_all"]);
      const listed = await pgStore.listAudit({ action: "auth.login" }, 1, 0);
      assert.equal(listed.total, 2);
      assert.equal(listed.items.length, 1);
      await assert.rejects(database.pg.query("UPDATE audit_log SET actor = 'x'"), /append-only/);
    } finally {
      setAdminPersistenceForTests(store);
      await database.close();
    }
  });
});
