import type { Anchor, Food, FoodWindow, Lane, Mark } from "../data/schema.ts";
import { anchorDay } from "./calendar.ts";
import { addDays, dayOf, toParts, type DayNum } from "./dates.ts";
import { headlineRank } from "./headliners.ts";

export type SeasonFood = Pick<Food, "id" | "ko" | "rr" | "en" | "phrase" | "lane" | "tier" | "windows"> & {
  /** Width over height of the food's halftone print, when it has one. */
  print?: number;
};

export interface Span {
  start: DayNum;
  end: DayNum;
  kind: FoodWindow["kind"];
  mark: Mark;
  label?: string;
}

export type Phase = "first" | "peak" | "last";

export interface Status {
  phase: Phase;
  /** Days left in the unbroken run, including today. */
  daysLeft: number;
  /** Days into the unbroken run. */
  daysIn: number;
  runLength: number;
  label?: string;
}

function spanOf(window: FoodWindow, year: number): Span {
  const base = {
    kind: window.kind,
    mark: window.mark,
    ...(window.label ? { label: window.label } : {}),
  };
  if ("anchor" in window) {
    const center = anchorDay(window.anchor satisfies Anchor, year);
    return { ...base, start: addDays(center, -window.before), end: addDays(center, window.after) };
  }
  const [fromMonth = 1, fromDate = 1] = window.from.split("-").map(Number);
  const [toMonth = 1, toDate = 1] = window.to.split("-").map(Number);
  const start = dayOf(year, fromMonth, fromDate);
  const wraps = toMonth * 100 + toDate < fromMonth * 100 + fromDate;
  return { ...base, start, end: dayOf(wraps ? year + 1 : year, toMonth, toDate) };
}

/** Every span of a food that starts in the given calendar year. */
export const spansInYear = (windows: readonly FoodWindow[], year: number): Span[] =>
  windows.map((window) => spanOf(window, year));

function spansNear(windows: readonly FoodWindow[], year: number): Span[] {
  return [year - 1, year, year + 1].flatMap((y) => spansInYear(windows, y));
}

interface Run {
  start: DayNum;
  end: DayNum;
  spans: Span[];
}

function runsOf(spans: readonly Span[]): Run[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const runs: Run[] = [];
  for (const span of sorted) {
    const last = runs.at(-1);
    if (last && span.start <= last.end + 1) {
      if (span.end > last.end) last.end = span.end;
      last.spans.push(span);
    } else {
      runs.push({ start: span.start, end: span.end, spans: [span] });
    }
  }
  return runs;
}

function phaseIn(run: Run, day: DayNum): Phase {
  const peaks = run.spans.filter((span) => span.kind === "peak");
  const core = peaks.length > 0 ? peaks : run.spans;
  const coreStart = Math.min(...core.map((span) => span.start));
  const coreEnd = Math.max(...core.map((span) => span.end));
  if (day < coreStart) return "first";
  if (day > coreEnd) return "last";
  const length = run.end - run.start + 1;
  const edge = Math.max(3, Math.min(12, Math.round(length * 0.15)));
  if (coreStart === run.start && day - run.start < edge && length > 7) return "first";
  if (coreEnd === run.end && run.end - day < edge && length > 7) return "last";
  return "peak";
}

export function statusAt(windows: readonly FoodWindow[], day: DayNum): Status | null {
  if (windows.length === 0) return null;
  const { year } = toParts(day);
  const run = runsOf(spansNear(windows, year)).find((entry) => entry.start <= day && day <= entry.end);
  if (!run) return null;
  const active = run.spans.find((span) => span.start <= day && day <= span.end && span.label);
  return {
    phase: phaseIn(run, day),
    daysLeft: run.end - day + 1,
    daysIn: day - run.start + 1,
    runLength: run.end - run.start + 1,
    ...(active?.label ? { label: active.label } : {}),
  };
}

/** The first day of the next run after `day`, or null for undated foods. */
export function nextArrival(windows: readonly FoodWindow[], day: DayNum): DayNum | null {
  if (windows.length === 0) return null;
  const { year } = toParts(day);
  const next = runsOf(spansNear(windows, year)).find((run) => run.start > day);
  return next ? next.start : null;
}

/** Length in days of the longest unbroken run, using a representative year. */
export function longestRun(windows: readonly FoodWindow[], year: number): number {
  const runs = runsOf(spansInYear(windows, year));
  return runs.reduce((longest, run) => Math.max(longest, run.end - run.start + 1), 0);
}

const FLEETING_LANES: readonly Lane[] = ["fish", "sea", "fruit", "greens"];
const FLEETING_DAYS = 32;

export function isFleeting(food: SeasonFood, year: number): boolean {
  const peaks = food.windows.filter((window) => window.kind === "peak");
  const length = longestRun(peaks.length > 0 ? peaks : food.windows, year);
  const sourced = food.windows.some((window) => window.mark === "sourced");
  return sourced && length > 0 && length <= FLEETING_DAYS && FLEETING_LANES.includes(food.lane);
}

const TIER_SCORE: Record<Food["tier"], number> = { national: 100, known: 40, local: 0 };
const PHASE_SCORE: Record<Phase, number> = { peak: 20, last: 12, first: 10 };
const MARK_SCORE: Record<Mark, number> = { sourced: 0, list: -6, weak: -6, est: -3 };

export interface InSeason<F extends SeasonFood = SeasonFood> {
  food: F;
  status: Status;
  score: number;
}

/** Foods in season on a day, best first. */
export function inSeason<F extends SeasonFood>(foods: readonly F[], day: DayNum): InSeason<F>[] {
  const out: InSeason<F>[] = [];
  for (const food of foods) {
    const status = statusAt(food.windows, day);
    if (!status) continue;
    const mark = food.windows[0]?.mark ?? "sourced";
    const fame = Math.max(0, 30 - headlineRank(food.id));
    const score = TIER_SCORE[food.tier] + PHASE_SCORE[status.phase] + MARK_SCORE[mark] + fame - status.runLength / 40;
    out.push({ food, status, score });
  }
  return out.sort((a, b) => b.score - a.score || a.food.id.localeCompare(b.food.id));
}
