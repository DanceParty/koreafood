import type { CalendarEvent, Lane } from "../data/schema.ts";
import rawEvents from "../data/generated/events.client.json";
import rawFoods from "../data/generated/foods.client.json";
import { anchorDay } from "./calendar.ts";
import { dayOf, toParts, type DayNum } from "./dates.ts";
import type { SeasonFood } from "./season.ts";

// scripts/validate-data.ts checks both files against the schema before every build.
export const FOODS = rawFoods as readonly SeasonFood[];
export const EVENTS = rawEvents as readonly CalendarEvent[];

export const LANE_LABELS: Record<Lane, { ko: string; en: string }> = {
  fish: { ko: "생선", en: "Fish" },
  sea: { ko: "해산물", en: "Shellfish & sea" },
  fruit: { ko: "과일", en: "Fruit & nuts" },
  greens: { ko: "채소", en: "Greens & roots" },
  street: { ko: "길거리·음식", en: "Street & dishes" },
  ferment: { ko: "저장·발효", en: "Ferments & preserves" },
  holiday: { ko: "명절·절기", en: "Holidays" },
};

export interface DatedEvent {
  event: CalendarEvent;
  on: DayNum;
}

function dateIn(event: CalendarEvent, year: number): DayNum | null {
  if (event.year !== undefined && event.year !== year) return null;
  if (event.anchor) return anchorDay(event.anchor, year);
  if (event.date) {
    const [month = 1, date = 1] = event.date.split("-").map(Number);
    return dayOf(year, month, date);
  }
  return null;
}

/** Dated moments on or after a day, soonest first. */
export function upcoming(from: DayNum, limit: number): DatedEvent[] {
  const { year } = toParts(from);
  const out: DatedEvent[] = [];
  for (const event of EVENTS) {
    for (const candidate of [year, year + 1]) {
      const on = dateIn(event, candidate);
      if (on !== null && on >= from) {
        out.push({ event, on });
        break;
      }
    }
  }
  return out.sort((a, b) => a.on - b.on).slice(0, limit);
}
