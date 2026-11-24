import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { buildItinerary, MAX_ITINERARY_DAYS } = await import("../src/lib/planner/itinerary");
const { createStayPlan } = await import("../src/lib/planner/rules");

const base = { purpose: "weekend" as const, arrival: "airport" as const, checkIn: "", checkOut: "", adults: 2, children: 0, destination: "", preferences: { breakfast: false, airportPickup: false, earlyCheckIn: false, lateCheckout: false } };
const plan = (input: typeof base) => buildItinerary(input, createStayPlan(input));

describe("stay itinerary", () => {
  test("without dates it is a three-day sample with no dates attached", () => {
    const days = plan(base);
    assert.deepEqual(days.map((day) => day.kind), ["arrival", "stay", "departure"]);
    assert.ok(days.every((day) => day.date === null));
  });

  test("with dates each shown day carries its own date, ending on the check-out day", () => {
    const days = plan({ ...base, checkIn: "2026-12-10", checkOut: "2026-12-12" });
    assert.deepEqual(days.map((day) => day.date), ["2026-12-10", "2026-12-11", "2026-12-12"]);
    assert.deepEqual(days.map((day) => day.number), [1, 2, 3]);
  });

  test("a long stay is summarised: capped length, departure still on the check-out date", () => {
    const days = plan({ ...base, checkIn: "2026-12-01", checkOut: "2026-12-15" });
    assert.equal(days.length, MAX_ITINERARY_DAYS);
    assert.equal(days.at(-1)?.kind, "departure");
    assert.equal(days.at(-1)?.date, "2026-12-15");
  });

  test("a one-night stay is arrival then departure", () => {
    assert.deepEqual(plan({ ...base, checkIn: "2026-12-10", checkOut: "2026-12-11" }).map((day) => day.kind), ["arrival", "departure"]);
  });

  test("requests the guest made appear, and unrequested ones do not", () => {
    const withRequests = JSON.stringify(plan({ ...base, preferences: { breakfast: true, airportPickup: false, earlyCheckIn: true, lateCheckout: true } }));
    assert.match(withRequests, /early check-in request/);
    assert.match(withRequests, /late check-out request/);
    assert.match(withRequests, /breakfast rate/);
    const without = JSON.stringify(plan(base));
    assert.equal(/early check-in request|late check-out request/.test(without), false);
  });

  test("the destination the guest named is used on the first full day", () => {
    const days = plan({ ...base, destination: "Hazratganj" });
    assert.ok(days[1].blocks.some((block) => block.title === "Hazratganj"));
  });

  test("it states no prices, opening hours or travel times", () => {
    const text = JSON.stringify(plan({ ...base, checkIn: "2026-12-10", checkOut: "2026-12-13", purpose: "business" }));
    assert.equal(/₹|Rs\.?\s?\d|\b\d+\s?(min|minutes|km)\b|\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i.test(text), false);
  });
});
