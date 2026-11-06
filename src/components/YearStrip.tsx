import type { Food } from "../data/schema.ts";
import { dayOf, MONTHS_SHORT, yearLength } from "../lib/dates.ts";
import { spansInYear } from "../lib/season.ts";

interface Segment {
  left: number;
  width: number;
  class: string;
  title: string;
}

function segments(start: number, end: number, year: number, cls: string, title: string): Segment[] {
  const first = dayOf(year, 1, 1);
  const length = yearLength(year);
  const from = ((start - first) % length + length) % length;
  const span = end - start + 1;
  const pct = (value: number) => (value / length) * 100;
  if (from + span <= length) return [{ left: pct(from), width: pct(span), class: cls, title }];
  return [
    { left: pct(from), width: pct(length - from), class: cls, title },
    { left: 0, width: pct(from + span - length), class: cls, title },
  ];
}

function closureSpan(closure: Food["closures"][number], year: number) {
  const [fromMonth = 1, fromDate = 1] = closure.from.split("-").map(Number);
  const [toMonth = 1, toDate = 1] = closure.to.split("-").map(Number);
  const wraps = toMonth * 100 + toDate < fromMonth * 100 + fromDate;
  return { start: dayOf(year, fromMonth, fromDate), end: dayOf(wraps ? year + 1 : year, toMonth, toDate) };
}

export function YearStrip({ food, year, labels = false }: { food: Pick<Food, "windows" | "closures">; year: number; labels?: boolean }) {
  const spans = spansInYear(food.windows, year).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "season" ? -1 : 1));
  return (
    <div class={`strip${labels ? " strip-big" : ""}`}>
      <div class="strip-track">
        {food.closures.flatMap((closure) => {
          const { start, end } = closureSpan(closure, year);
          return segments(start, end, year, "closed", `Closed by law ${closure.from} to ${closure.to}`);
        }).map((segment, index) => (
          <i key={`c${index}`} class={segment.class} title={segment.title} style={{ left: `${segment.left}%`, width: `${segment.width}%` }} />
        ))}
        {spans.flatMap((span) => segments(span.start, span.end, year, `${span.kind}${span.mark === "est" ? " est" : ""}${span.mark === "weak" || span.mark === "list" ? " thin" : ""}`, span.label ?? "")).map((segment, index) => (
          <i key={index} class={segment.class} title={segment.title} style={{ left: `${segment.left}%`, width: `${segment.width}%` }} />
        ))}
        <b class="strip-today" aria-hidden="true" />
      </div>
      {labels ? (
        <div class="strip-months" aria-hidden="true">
          {MONTHS_SHORT.map((month) => <span key={month}>{month}</span>)}
        </div>
      ) : null}
    </div>
  );
}
