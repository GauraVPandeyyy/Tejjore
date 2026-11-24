import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { addDays, nightsBetween, stayPresets, weekdayOf } = await import("../src/lib/planner/dates");

describe("planner date presets", () => {
  test("arithmetic crosses month and year ends", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(nightsBetween("2026-12-30", "2027-01-02"), 3);
  });

  test("from a Tuesday: this weekend is the coming Friday to Sunday", () => {
    const tuesday = "2026-12-08";
    assert.equal(weekdayOf(tuesday), 2);
    const presets = stayPresets(tuesday);
    const weekend = presets.find((item) => item.id === "this-weekend");
    assert.deepEqual([weekend?.checkIn, weekend?.checkOut], ["2026-12-11", "2026-12-13"]);
    const next = presets.find((item) => item.id === "next-weekend");
    assert.deepEqual([next?.checkIn, next?.checkOut], ["2026-12-18", "2026-12-20"]);
  });

  test("on a Friday this weekend is what is left of it; on a Saturday or Sunday it is omitted", () => {
    const friday = stayPresets("2026-12-11");
    assert.deepEqual(["this-weekend", friday[0].checkIn, friday[0].checkOut], ["this-weekend", "2026-12-12", "2026-12-13"]);
    assert.deepEqual([friday[1].checkIn, friday[1].checkOut], ["2026-12-18", "2026-12-20"]);
    for (const day of ["2026-12-12", "2026-12-13"]) {
      const presets = stayPresets(day);
      assert.equal(presets.some((item) => item.id === "this-weekend"), false);
      assert.deepEqual([presets[0].id, presets[0].checkIn, presets[0].checkOut], ["next-weekend", "2026-12-18", "2026-12-20"]);
    }
  });

  test("every preset is a valid future stay of at least one night", () => {
    for (const today of ["2026-12-08", "2026-12-11", "2026-12-12", "2026-12-13", "2027-02-27"]) {
      for (const preset of stayPresets(today)) {
        assert.ok(preset.checkIn > today, `${preset.id} from ${today} starts after today`);
        assert.ok(nightsBetween(preset.checkIn, preset.checkOut) >= 1, `${preset.id} from ${today} has a night`);
      }
    }
  });
});
