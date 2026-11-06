import { describe, expect, it } from "vitest";
import type { FoodWindow } from "../data/schema.ts";
import { anchorDay, lunarOf, termAt } from "./calendar.ts";
import { dayOf, parseIso, toIso, yearFraction } from "./dates.ts";
import { hasBatchim, itIs } from "./korean.ts";
import { nextArrival, statusAt } from "./season.ts";

const wrapped: FoodWindow[] = [
  { from: "12-01", to: "02-28", kind: "peak", mark: "sourced" },
  { from: "11-01", to: "11-30", kind: "season", mark: "sourced" },
];

describe("statusAt", () => {
  it("treats the run-up to a peak as first of the season", () => {
    expect(statusAt(wrapped, dayOf(2026, 11, 6))?.phase).toBe("first");
  });

  it("finds a peak that wrapped from the previous year", () => {
    expect(statusAt(wrapped, dayOf(2027, 1, 15))?.phase).toBe("peak");
  });

  it("counts days left across the whole run", () => {
    expect(statusAt(wrapped, dayOf(2027, 2, 28))?.daysLeft).toBe(1);
  });

  it("is null out of season", () => {
    expect(statusAt(wrapped, dayOf(2026, 7, 1))).toBeNull();
  });

  it("calls the end of a peak-only run the last of it", () => {
    const short: FoodWindow[] = [{ from: "05-01", to: "06-30", kind: "peak", mark: "sourced" }];
    expect(statusAt(short, dayOf(2027, 6, 28))?.phase).toBe("last");
  });

  it("follows lunar anchors from year to year", () => {
    const songpyeon: FoodWindow[] = [{ anchor: "chuseok", before: 2, after: 0, kind: "peak", mark: "sourced" }];
    expect(statusAt(songpyeon, parseIso("2026-09-25"))).not.toBeNull();
    expect(statusAt(songpyeon, parseIso("2026-09-15"))).toBeNull();
    expect(statusAt(songpyeon, parseIso("2027-09-15"))).not.toBeNull();
  });
});

describe("nextArrival", () => {
  it("finds the next start across the year end", () => {
    const next = nextArrival(wrapped, dayOf(2026, 7, 1));
    expect(next === null ? null : toIso(next)).toBe("2026-11-01");
  });

  it("returns null with no windows", () => {
    expect(nextArrival([], dayOf(2026, 7, 1))).toBeNull();
  });
});

describe("calendar", () => {
  it("matches published dates", () => {
    expect(toIso(anchorDay("seollal", 2027))).toBe("2027-02-07");
    expect(toIso(anchorDay("ipdong", 2026))).toBe("2026-11-07");
    expect(toIso(anchorDay("chobok", 2026))).toBe("2026-07-15");
  });

  it("converts to lunar dates", () => {
    expect(lunarOf(dayOf(2026, 11, 6))).toEqual({ month: 9, date: 27, leap: false });
    expect(lunarOf(dayOf(2027, 2, 7))).toEqual({ month: 1, date: 1, leap: false });
  });

  it("finds the current solar term across the year end", () => {
    expect(termAt(dayOf(2026, 11, 6)).term.key).toBe("sanggang");
    expect(termAt(dayOf(2026, 11, 7)).term.key).toBe("ipdong");
    expect(termAt(dayOf(2027, 1, 2)).term.key).toBe("dongji");
    expect(termAt(dayOf(2027, 1, 2)).next.key).toBe("sohan");
  });
});

describe("dates", () => {
  it("keeps year fraction inside the year", () => {
    expect(yearFraction(dayOf(2026, 1, 1))).toBe(0);
    expect(yearFraction(dayOf(2026, 12, 31) + 0.99)).toBeLessThan(1);
  });
});

describe("korean", () => {
  it("picks the right ending after a batchim", () => {
    expect(hasBatchim("굴")).toBe(true);
    expect(hasBatchim("방어")).toBe(false);
    expect(itIs("굴")).toBe("굴이지.");
    expect(itIs("방어")).toBe("방어지.");
  });
});
