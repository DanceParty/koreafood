import { describe, expect, it } from "vitest";
import { anchorDay } from "./calendar.ts";
import { isMain, MAIN_LIST } from "../data/main-list.ts";
import { ALL_FOODS } from "./foods.ts";
import { addDays, dayOf } from "./dates.ts";
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

describe("main list", () => {
  const main = ALL_FOODS.filter((food) => isMain(food.id));

  it("only names foods that exist and have dates", () => {
    expect(MAIN_LIST.filter((id) => !main.some((food) => food.id === id && food.windows.length > 0))).toEqual([]);
  });

  it("stays short enough to read on every day of the year", () => {
    for (let index = 0; index < 365; index += 1) {
      const count = inSeason(main, addDays(dayOf(2027, 1, 1), index)).length;
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(25);
    }
  });
});

describe("wheel layout", () => {
  const main = ALL_FOODS.filter((food) => isMain(food.id));

  it("puts every main list food on a track and nothing else", () => {
    const { tracks } = layoutTracks(main, 2027);
    expect(new Set(tracks.map((track) => track.food.id))).toEqual(new Set(MAIN_LIST));
  });

  it("keeps tracks inside the hub and rim", () => {
    const { tracks, step } = layoutTracks(main, 2027);
    expect(step).toBeGreaterThanOrEqual(11);
    for (const track of tracks) {
      expect(track.radius).toBeGreaterThan(150);
      expect(track.radius).toBeLessThan(432);
    }
  });
});
