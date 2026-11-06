import { dayOf, yearLength } from "./dates.ts";
import { spansInYear, type SeasonFood, type Span } from "./season.ts";

export const WHEEL = {
  size: 1000,
  center: 500,
  rimOuter: 494,
  rimInner: 432,
  trackOuter: 424,
  trackInner: 158,
} as const;

export interface Arc {
  id: string;
  kind: Span["kind"];
  mark: Span["mark"];
  start: number;
  sweep: number;
}

export interface Track {
  food: SeasonFood;
  arcs: Arc[];
  radius: number;
}

const MAX_STEP = 17;
const GAP_FRACTION = 0.012;

function arcsOf(food: SeasonFood, year: number): Arc[] {
  const first = dayOf(year, 1, 1);
  const length = yearLength(year);
  const arcs: Arc[] = [];
  for (const span of spansInYear(food.windows, year)) {
    const start = ((span.start - first) / length) % 1;
    const sweep = Math.min(1, (span.end - span.start + 1) / length);
    arcs.push({
      id: food.id,
      kind: span.kind,
      mark: span.mark,
      start: start < 0 ? start + 1 : start,
      sweep,
    });
  }
  return arcs;
}

type Interval = readonly [number, number];

function intervalsOf(arcs: readonly Arc[]): Interval[] {
  return arcs.flatMap((arc): Interval[] => {
    const end = arc.start + arc.sweep;
    return end > 1
      ? [[arc.start, 1], [0, end - 1]]
      : [[arc.start, end]];
  });
}

const collide = (a: readonly Interval[], b: readonly Interval[]) =>
  a.some(([aStart, aEnd]) =>
    b.some(([bStart, bEnd]) => aStart < bEnd + GAP_FRACTION && bStart < aEnd + GAP_FRACTION));

const MIN_ROOM = 0.06;

/** Peak arcs with room for a label, so short holiday windows don't collide with the name beside them. */
const peaksOf = (arcs: readonly Arc[]) => {
  const peaks = arcs.filter((arc) => arc.kind === "peak");
  const roomy = (peaks.length > 0 ? peaks : arcs).map((arc) => ({ ...arc, sweep: Math.max(arc.sweep, MIN_ROOM) }));
  return intervalsOf(roomy);
};

type Placed = Pick<Track, "food" | "arcs">;

function pack(items: readonly Placed[]): Placed[][] {
  const rows: Placed[][] = [];
  for (const item of items) {
    const intervals = peaksOf(item.arcs);
    const row = rows.find((candidate) => candidate.every((other) => !collide(peaksOf(other.arcs), intervals)));
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows;
}

const coverage = (arcs: readonly Arc[]) => peaksOf(arcs).reduce((sum, [start, end]) => sum + end - start, 0);
const TIER_RANK = { national: 0, known: 1, local: 2 } as const;

/** Packs arcs into concentric tracks so foods that never overlap can share one. National foods sit outermost. */
export function layoutTracks(foods: readonly SeasonFood[], year: number): { tracks: Track[]; step: number } {
  const placed = foods
    .filter((food) => food.windows.length > 0)
    .map((food) => ({ food, arcs: arcsOf(food, year) }))
    .sort((a, b) =>
      TIER_RANK[a.food.tier] - TIER_RANK[b.food.tier]
      || coverage(b.arcs) - coverage(a.arcs)
      || a.food.id.localeCompare(b.food.id));

  const rows = pack(placed);
  const step = Math.min(MAX_STEP, (WHEEL.trackOuter - WHEEL.trackInner) / Math.max(rows.length, 1));
  const tracks = rows.flatMap((row, index) =>
    row.map((item) => ({ ...item, radius: WHEEL.trackOuter - step * (index + 0.5) })));
  return { tracks, step };
}

/** The peak arcs worth naming: the longest first, skipping any that overlap one already named. */
export function labelledArcs(arcs: readonly Arc[]): Arc[] {
  const peaks = arcs.filter((arc) => arc.kind === "peak");
  const named: Arc[] = [];
  for (const arc of [...(peaks.length > 0 ? peaks : arcs)].sort((a, b) => b.sweep - a.sweep)) {
    if (!named.some((other) => collide(intervalsOf([other]), intervalsOf([arc])))) named.push(arc);
  }
  return named;
}

const round = (value: number) => Math.round(value * 10) / 10;

export function polar(radius: number, fraction: number): { x: number; y: number } {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return { x: round(WHEEL.center + radius * Math.cos(angle)), y: round(WHEEL.center + radius * Math.sin(angle)) };
}

/** SVG path along a circle from a fraction of the year, clockwise, for a sweep. */
export function arcPath(radius: number, start: number, sweep: number): string {
  const safe = Math.min(sweep, 0.9995);
  const from = polar(radius, start);
  const to = polar(radius, start + safe);
  return `M${from.x} ${from.y}A${radius.toFixed(1)} ${radius.toFixed(1)} 0 ${safe > 0.5 ? 1 : 0} 1 ${to.x} ${to.y}`;
}
