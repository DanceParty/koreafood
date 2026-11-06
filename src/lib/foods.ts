import { foodSchema, type Food, type Lane } from "../data/schema.ts";
import ferment from "../data/foods/ferment.json";
import fish from "../data/foods/fish.json";
import fruit from "../data/foods/fruit.json";
import greens from "../data/foods/greens.json";
import holiday from "../data/foods/holiday.json";
import sea from "../data/foods/sea.json";
import street from "../data/foods/street.json";
import { dayOf, toParts, todayInSeoul, yearLength, type DayNum } from "./dates.ts";
import { headlineRank } from "./headliners.ts";
import { inSeason, spansInYear, statusAt, type InSeason, type Phase } from "./season.ts";
import { printedOn, type Printed } from "./palette.ts";

export const ALL_FOODS: readonly Food[] = foodSchema.array().parse([
  ...fish, ...sea, ...fruit, ...greens, ...street, ...ferment, ...holiday,
]);

export const foodById = new Map(ALL_FOODS.map((food) => [food.id, food]));

const TIER_RANK: Record<Food["tier"], number> = { national: 0, known: 1, local: 2 };
export const byImportance = (a: Food, b: Food) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.id.localeCompare(b.id);

/** The next occurrence of a month, so month pages show upcoming dates. */
export function yearForMonth(month: number): number {
  const { year, month: current } = toParts(todayInSeoul());
  return month >= current ? year : year + 1;
}

export interface MonthEntry {
  food: Food;
  phase: Phase;
  arrives: boolean;
  leaves: boolean;
}

export function monthFoods(month: number, year: number): MonthEntry[] {
  const start = dayOf(year, month, 1);
  const end = dayOf(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1);
  const out: MonthEntry[] = [];
  for (const food of ALL_FOODS) {
    const phases = new Set<Phase>();
    for (let day = start; day < end; day = (day + 1) as DayNum) {
      const status = statusAt(food.windows, day);
      if (status) phases.add(status.phase);
    }
    if (phases.size === 0) continue;
    out.push({
      food,
      phase: phases.has("peak") ? "peak" : phases.has("first") ? "first" : "last",
      arrives: !statusAt(food.windows, (start - 1) as DayNum),
      leaves: !statusAt(food.windows, end),
    });
  }
  return out.sort((a, b) => byImportance(a.food, b.food) || 0).sort((a, b) =>
    a.food.tier === "national" && b.food.tier === "national" ? headlineRank(a.food.id) - headlineRank(b.food.id) : 0);
}

export function topOn(day: DayNum, limit: number): InSeason<Food>[] {
  return inSeason(ALL_FOODS, day).slice(0, limit);
}

export const midMonth = (month: number, year: number) => dayOf(year, month, 15);

/** The ink of the middle of a food's first peak, so each food prints in its own season. */
export function printedForFood(food: Food): Printed {
  const year = toParts(todayInSeoul()).year;
  const spans = spansInYear(food.windows, year);
  const main = spans.find((span) => span.kind === "peak") ?? spans[0];
  if (!main) return printedOn(dayOf(year, 6, 21));
  const center = Math.round((main.start + main.end) / 2);
  const first = dayOf(year, 1, 1);
  return printedOn((first + (center - first) % yearLength(year)) as DayNum);
}

export const LANE_ORDER: readonly Lane[] = ["fish", "sea", "fruit", "greens", "street", "ferment", "holiday"];

const SOURCE_NAMES: readonly (readonly [RegExp, string])[] = [
  [/^입질 /, "Kim Ji-min, "],
  [/^Namu list$/, "Namuwiki list"],
  [/^Namu$/, "Namuwiki"],
  [/^EK$/, "Encyclopedia of Korean Culture"],
  [/^RDA list$/, "Farm agency list"],
  [/^RDA$/, "Rural Development Administration"],
  [/^Pick /, "Fisheries ministry pick, "],
  [/^Ministry picks$/, "Fisheries ministry picks"],
  [/^Geoje list$/, "Geoje fishing list"],
  [/^Zuzu guide$/, "Travel guide"],
  [/^Statute$/, "Fisheries statute"],
];

export function sourceLabel(label: string): string {
  for (const [pattern, name] of SOURCE_NAMES) {
    if (pattern.test(label)) return label.replace(pattern, name);
  }
  return label;
}
