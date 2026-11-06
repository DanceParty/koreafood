import { describe, expect, it } from "vitest";
import { anchorDay } from "./calendar.ts";
import { ALL_FOODS } from "./foods.ts";
import { dayOf } from "./dates.ts";
import { inSeason } from "./season.ts";
import { layoutTracks } from "./wheel.ts";

describe("food data", () => {
  it("has something national in season every month", () => {
    for (let month = 1; month <= 12; month += 1) {
      const entries = inSeason(ALL_FOODS, dayOf(2027, month, 15));
      expect(entries.length).toBeGreaterThan(30);
      expect(entries.filter((entry) => entry.food.tier === "national").length).toBeGreaterThan(0);
    }
  });

  it("resolves every anchor in every covered year", () => {
    for (const food of ALL_FOODS) {
      for (const window of food.windows) {
        if ("anchor" in window) {
          for (let year = 2026; year <= 2036; year += 1) expect(anchorDay(window.anchor, year)).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps research language out of reader-facing copy", () => {
    const banned = /\bthe report\b|\bresearchers?\b|\bthe notes\b|\bNamu\b|\bcalls it alive\b/i;
    const offenders = ALL_FOODS.filter((food) => banned.test(`${food.blurb} ${food.caveat ?? ""}`));
    expect(offenders.map((food) => food.id)).toEqual([]);
  });
});

describe("window labels", () => {
  it("are plain English", () => {
    const labels = ALL_FOODS.flatMap((food) => food.windows.flatMap((window) => (window.label ? [`${food.id}: ${window.label}`] : [])));
    expect(labels.filter((label) => /[가-힣]|\bNamu\b|\bRDA\b/.test(label))).toEqual([]);
  });
});

describe("wheel layout", () => {
  it("puts every national or known food with a window on a track", () => {
    const { tracks } = layoutTracks(ALL_FOODS, 2027);
    const placed = new Set(tracks.map((track) => track.food.id));
    const expected = ALL_FOODS.filter((food) => food.windows.length > 0 && food.tier !== "local");
    expect(expected.filter((food) => !placed.has(food.id)).map((food) => food.id)).toEqual([]);
  });

  it("keeps tracks inside the hub and rim", () => {
    const { tracks } = layoutTracks(ALL_FOODS, 2027);
    for (const track of tracks) {
      expect(track.radius).toBeGreaterThan(150);
      expect(track.radius).toBeLessThan(432);
    }
  });
});
