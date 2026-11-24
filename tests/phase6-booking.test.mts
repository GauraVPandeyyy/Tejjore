import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import { isolateEnv, makeReservation, writeStore } from "./setup/env.mts";
import { createTestDatabase, type TestDatabase } from "./setup/pglite.mts";

// Phase 6: booking references, mobile lookup, occupancy and the authoritative quote.
const { storePath } = isolateEnv();
const BASE = "http://localhost:3000";

const { resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const { setContentDatabaseForTests } = await import("../src/lib/content/db");
const { resetContentCircuit } = await import("../src/lib/content/source");
const { createBookingReference, isBookingReference, normalizeBookingReference } = await import("../src/lib/booking/reference");
const { normalizePhoneE164 } = await import("../src/lib/phone");
const { occupancyError } = await import("../src/lib/booking/validation");
const { maskGuestName, toMaskedReservationView } = await import("../src/lib/booking/maskedView");
const lookupRoute = await import("../src/app/api/reservations/lookup/route");
const reservationsRoute = await import("../src/app/api/reservations/route");
const quoteRoute = await import("../src/app/api/reservations/quote/route");
const availabilityRoute = await import("../src/app/api/availability/route");
const legacyRoute = await import("../src/app/api/booking-request/route");

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const post = (path: string, body: unknown) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: JSON.stringify(body) });
const json = async (response: Response) => (await response.json()) as Json;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

let database: TestDatabase;
before(async () => {
  database = await createTestDatabase({ seed: true });
  setContentDatabaseForTests(database.db);
});
after(async () => {
  setContentDatabaseForTests(null);
  await database.close();
});
beforeEach(() => {
  resetMemoryRateLimits();
  resetContentCircuit();
});

describe("booking references and mobiles", () => {
  test("new references are 50-bit Crockford base32; both formats are accepted", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 500; index += 1) {
      const reference = createBookingReference();
      assert.match(reference, /^TLV-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/);
      assert.ok(isBookingReference(reference));
      seen.add(reference);
    }
    assert.equal(seen.size, 500);
    assert.ok(isBookingReference("TLV-261004-ABC123"), "legacy format still valid");
    assert.ok(!isBookingReference("TLV-261004-ABC12"));
    assert.ok(!isBookingReference("TLO-ABCD1234"));
    assert.equal(normalizeBookingReference(" tlv-7kq2-m9xd-4p "), "TLV-7KQ2-M9XD-4P");
    assert.equal(normalizeBookingReference("TLV7KQ2M9XD4P"), "TLV-7KQ2-M9XD-4P");
    assert.equal(normalizeBookingReference("tlv-7kq2-m9xd-4p".replace("9", "o").replace("x", "i")), "TLV-7KQ2-M0XD-4P".replace("XD", "1D"), "Crockford look-alikes");
    assert.equal(normalizeBookingReference("tlv-261004-abc123"), "TLV-261004-ABC123");
  });

  test("mobile numbers normalise to E.164 (default +91)", () => {
    for (const input of ["98765 43210", "09876543210", "+91 98765-43210", "91 9876543210", "0091 9876543210", "(+91) 98765 43210"]) {
      assert.equal(normalizePhoneE164(input), "+919876543210", input);
    }
    assert.equal(normalizePhoneE164("+44 7700 900123"), "+447700900123");
    for (const input of ["", "12345", "abc", "+0123456789", null, undefined, 9876543210]) assert.equal(normalizePhoneE164(input), null, String(input));
  });

  test("masking: name and phone", () => {
    assert.equal(maskGuestName("Rahul", "Sharma"), "R. S****");
    assert.equal(maskGuestName("Asha", ""), "A****");
    assert.equal(maskGuestName("", ""), "Guest");
  });
});

describe("mobile lookup", () => {
  const reference = "TLV-7KQ2-M9XD-4P";
  beforeEach(() => writeStore(storePath, [makeReservation({ reference, accessTokenHash: "secret-token-hash" })]));

  test("reference + mobile returns a masked, read-only view", async () => {
    for (const phone of ["+91 98765 43210", "09876543210", "98765-43210"]) {
      resetMemoryRateLimits();
      const response = await lookupRoute.POST(post("/api/reservations/lookup", { reference: reference.toLowerCase(), phone }));
      assert.equal(response.status, 200, phone);
      const body = await json(response);
      assert.equal(body.reference, reference);
      assert.equal(body.guestNameMasked, "A. V****");
      assert.equal(body.phoneLast4, "3210");
      assert.equal(body.roomName, "Deluxe Room");
      assert.ok(typeof body.amountDue === "number" && body.nights === 2);
      const text = JSON.stringify(body);
      for (const secret of ["asha@example.test", "Asha", "Verma", "98765", "secret-token-hash", "accessToken", "Late arrival"]) assert.ok(!text.includes(secret), `leaks ${secret}`);
    }
  });

  test("a lookup writes nothing: no access token is issued", async () => {
    const { readFileSync } = await import("node:fs");
    const before = readFileSync(storePath, "utf8");
    await lookupRoute.POST(post("/api/reservations/lookup", { reference, phone: "9876543210" }));
    assert.equal(readFileSync(storePath, "utf8"), before);
  });

  test("wrong mobile, unknown reference and malformed input are indistinguishable", async () => {
    const attempts = [
      { reference, phone: "9000000000" },
      { reference: "TLV-AAAA-AAAA-AA", phone: "9876543210" },
      { reference: "nonsense", phone: "9876543210" },
      { reference, phone: "x" },
      {},
    ];
    const results: Array<[number, Json]> = [];
    for (const body of attempts) {
      resetMemoryRateLimits();
      const response = await lookupRoute.POST(post("/api/reservations/lookup", body));
      results.push([response.status, await json(response)]);
    }
    for (const [status, body] of results) {
      assert.equal(status, 404);
      assert.deepEqual(body, results[0][1]);
    }
    assert.equal(results[0][1].error.message, "We couldn't find a booking with those details.");
  });

  test("rate limited: 5 per client per 15 minutes, 10 per reference per day", async () => {
    const attempt = (phone: string, ref = reference) => lookupRoute.POST(post("/api/reservations/lookup", { reference: ref, phone }));
    for (let index = 0; index < 5; index += 1) assert.equal((await attempt("9000000000")).status, 404);
    const limited = await attempt("9876543210");
    assert.equal(limited.status, 429, "even the right mobile is refused while limited");
    assert.ok(limited.headers.get("retry-after"));
    assert.ok(!JSON.stringify(await json(limited)).includes(reference));
  });

  test("cross-site and non-JSON requests are refused", async () => {
    const crossSite = new Request(`${BASE}/api/reservations/lookup`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
    assert.equal((await lookupRoute.POST(crossSite)).status, 403);
    const plain = new Request(`${BASE}/api/reservations/lookup`, { method: "POST", headers: { origin: BASE, "content-type": "text/plain" }, body: "{}" });
    assert.equal((await lookupRoute.POST(plain)).status, 415);
  });

  test("an expired unpaid hold reads as expired and is not payable", () => {
    const expired = makeReservation({ status: "payment_pending", paymentStatus: "not_started", expiresAt: new Date(Date.now() - 60_000).toISOString() });
    const view = toMaskedReservationView(expired);
    assert.equal(view.status, "expired");
    assert.equal(view.holdActive, false);
    const live = toMaskedReservationView(makeReservation({ status: "payment_pending", paymentStatus: "not_started", expiresAt: new Date(Date.now() + 600_000).toISOString() }));
    assert.equal(live.status, "payment_pending");
    assert.equal(live.holdActive, true);
  });
});

describe("occupancy", () => {
  test("per-room limits scale with the number of rooms; unknown limits do not block", () => {
    const limits = { maxAdults: 2, maxChildren: 1 };
    assert.equal(occupancyError(limits, 2, 1, 1), null);
    assert.match(occupancyError(limits, 3, 0, 1)!, /up to 2 adults per room/);
    assert.equal(occupancyError(limits, 4, 2, 2), null);
    assert.match(occupancyError(limits, 3, 3, 2)!, /1 child per room \(2 for 2 rooms\)/);
    assert.equal(occupancyError({ maxAdults: null, maxChildren: null }, 12, 8, 1), null);
    assert.equal(occupancyError(null, 12, 8, 1), null);
  });

  test("availability exposes limits and the server refuses a booking that does not fit", async () => {
    await database.db.query("UPDATE rooms SET max_adults = 2, max_children = 1 WHERE id = 'deluxe'");
    const availability = await json(await availabilityRoute.POST(post("/api/availability", { checkIn: day(30), checkOut: day(32) })));
    const deluxe = availability.rooms.find((room: Json) => room.roomId === "deluxe");
    assert.equal(deluxe.maxAdults, 2);
    assert.equal(deluxe.maxChildren, 1);

    const booking = (adults: number) => ({
      stay: { checkIn: day(30), checkOut: day(32), adults, children: 0, rooms: 1 },
      roomId: "deluxe",
      ratePlanId: "room-only",
      addonIds: [],
      guest: { firstName: "Asha", lastName: "Verma", phone: "9876543210", email: "asha@example.test", preferredContact: "email", specialRequests: "" },
    });
    const refused = await reservationsRoute.POST(post("/api/reservations", booking(3)));
    assert.equal(refused.status, 400);
    assert.equal((await json(refused)).error.code, "OCCUPANCY_EXCEEDED");
    const quoteRefused = await quoteRoute.POST(post("/api/reservations/quote", booking(3)));
    assert.equal(quoteRefused.status, 400);
  });
});

describe("authoritative quote and reservation", () => {
  const stay = () => ({ checkIn: day(40), checkOut: day(42), adults: 2, children: 0, rooms: 1 });

  test("quote returns the server calculation; an unknown promo is explained", async () => {
    const ok = await quoteRoute.POST(post("/api/reservations/quote", { stay: stay(), roomId: "deluxe", ratePlanId: "room-only", addonIds: [] }));
    assert.equal(ok.status, 200);
    const { pricing } = await json(ok);
    assert.equal(pricing.nights, 2);
    assert.ok(pricing.grandTotal > 0 && pricing.nightlyRates.length === 2);
    const promo = await quoteRoute.POST(post("/api/reservations/quote", { stay: stay(), roomId: "deluxe", ratePlanId: "room-only", addonIds: [], promoCode: "NOPE" }));
    assert.equal(promo.status, 400);
    assert.match((await json(promo)).error.message, /promotional code/i);
    const past = await quoteRoute.POST(post("/api/reservations/quote", { stay: { ...stay(), checkIn: "2020-01-01", checkOut: "2020-01-03" }, roomId: "deluxe", ratePlanId: "room-only", addonIds: [] }));
    assert.equal(past.status, 400);
  });

  test("a new hold gets a new-format reference and the quoted price", async () => {
    writeStore(storePath, []);
    const body = { stay: stay(), roomId: "deluxe", ratePlanId: "room-only", addonIds: [], guest: { firstName: "Asha", lastName: "Verma", phone: "9876543210", email: "asha@example.test", preferredContact: "email", specialRequests: "" } };
    const quoted = (await json(await quoteRoute.POST(post("/api/reservations/quote", body)))).pricing;
    const created = await reservationsRoute.POST(post("/api/reservations", body));
    assert.equal(created.status, 201);
    const reservation = await json(created);
    assert.match(reservation.reference, /^TLV-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/);
    assert.equal(reservation.pricing.grandTotal, quoted.grandTotal, "one pricing source: quote and hold agree");
  });

  test("the retired duplicate route redirects with 308", async () => {
    const response = legacyRoute.POST(post("/api/booking-request", {}));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), `${BASE}/api/reservations`);
  });
});

describe("new-format references work on every reservation endpoint", () => {
  test("status and retrieve accept them (they used to accept only the legacy format)", async () => {
    const reference = "TLV-7KQ2-M9XD-4P";
    writeStore(storePath, [makeReservation({ reference })]);
    const status = await (await import("../src/app/api/reservations/status/route")).POST(post("/api/reservations/status", { reference, accessToken: "wrong" }));
    assert.equal(status.status, 403, "format accepted; access token rejected");
    const retrieve = await (await import("../src/app/api/reservations/retrieve/route")).POST(post("/api/reservations/retrieve", { reference, email: "asha@example.test", phone: "9876543210" }));
    assert.equal(retrieve.status, 200);
  });
});
