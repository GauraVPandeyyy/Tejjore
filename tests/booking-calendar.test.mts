import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { buildStayIcs } = await import("../src/lib/booking/calendar");

describe("stay calendar file", () => {
  const ics = buildStayIcs({ reference: "TLV-ABCD-EFGH-12", roomName: "Deluxe Room", checkIn: "2026-12-10", checkOut: "2026-12-12", now: new Date("2026-10-27T08:30:00Z") });

  test("is a well-formed all-day event from check-in to the exclusive check-out date", () => {
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /DTSTART;VALUE=DATE:20261210\r\n/);
    assert.match(ics, /DTEND;VALUE=DATE:20261212\r\n/);
    assert.match(ics, /DTSTAMP:20261027T083000Z\r\n/);
    assert.match(ics, /UID:TLV-ABCD-EFGH-12@tejjoralakeview\r\n/);
    assert.match(ics, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
  });

  test("escapes text values and folds nothing beyond 75 characters per line", () => {
    for (const line of ics.split("\r\n")) assert.ok(line.length <= 75, `line too long: ${line.length}`);
    assert.ok(ics.includes("LOCATION:C-1/242\\, Vikalp Khand\\, Gomti Nagar"), "commas in the address are escaped");
  });

  test("carries no guest contact details", () => {
    assert.equal(/@(?!tejjoralakeview)|\+91 ?9\d{4}/.test(ics.replace(/Hotel: \+91 96211 34909/, "")), false);
  });
});
