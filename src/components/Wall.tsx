import { useComputed, useSignal } from "@preact/signals";
import { LANES } from "../data/constants.ts";
import type { Lane } from "../data/schema.ts";
import { FOODS, LANE_LABELS } from "../lib/client-data.ts";
import { dayOf, shortDate, toParts, type DayNum } from "../lib/dates.ts";
import { inSeason, isFleeting, type InSeason, type Phase } from "../lib/season.ts";
import { day, laneFilter, setDayNow, settledDay } from "../lib/store.ts";

const PHASES: readonly { phase: Phase; ko: string; rr: string; en: string; gloss: string }[] = [
  { phase: "peak", ko: "제철", rr: "jecheol", en: "At their best", gloss: "The right time for it." },
  { phase: "first", ko: "첫물", rr: "cheonmul", en: "Just in", gloss: "First of the crop or catch." },
  { phase: "last", ko: "끝물", rr: "kkeunmul", en: "Last call", gloss: "End of the run. Go soon." },
];

function Token({ entry }: { entry: InSeason }) {
  const { food, status } = entry;
  const uncertain = food.windows[0]?.mark === "est";
  return (
    <a class={`token t-${food.tier}`} href={`/food/${food.id}/`} data-print={food.print ? `${food.id}:${food.print}` : undefined}>
      <span class="token-ko" lang="ko">{food.ko}{uncertain ? <sup title="Estimated window">?</sup> : null}</span>
      <span class="token-en">{food.en}</span>
      {status.phase === "last" && status.daysLeft <= 14 ? <span class="token-left">{status.daysLeft}d left</span> : null}
    </a>
  );
}

interface Peek {
  id: string;
  ratio: number;
  x: number;
  y: number;
}

export function Wall() {
  const peek = useSignal<Peek | null>(null);

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
    const value = event.target.closest<HTMLElement>("[data-print]")?.dataset.print;
    if (!value) {
      peek.value = null;
      return;
    }
    const [id = "", ratio = "1"] = value.split(":");
    peek.value = { id, ratio: Number(ratio), x: event.clientX, y: event.clientY };
  };

  const entries = useComputed(() => {
    const filter = laneFilter.value;
    const current = settledDay.value;
    const { year } = toParts(current);
    return inSeason(FOODS, current).filter((entry) => {
      if (filter === "all") return true;
      if (filter === "fleeting") return isFleeting(entry.food, year);
      return entry.food.lane === filter;
    });
  });

  const counts = useComputed(() => {
    const totals = new Map<Lane, number>();
    for (const entry of inSeason(FOODS, settledDay.value)) {
      totals.set(entry.food.lane, (totals.get(entry.food.lane) ?? 0) + 1);
    }
    return totals;
  });

  const list = entries.value;
  const { year } = toParts(day.value);
  return (
    <section id="wall" class="wall" aria-label="Foods in season on the selected day" onPointerMove={onPointerMove} onPointerLeave={() => { peek.value = null; }}>
      <div class="wall-bar">
        <label class="scrub">
          <span class="scrub-date">{shortDate(day.value)}</span>
          <input
            type="range"
            min={dayOf(year, 1, 1)}
            max={dayOf(year, 12, 31)}
            value={day.value}
            aria-label="Move through the year"
            onInput={(event) => setDayNow(event.currentTarget.valueAsNumber as DayNum)}
          />
        </label>
        <div class="filters" role="group" aria-label="Filter foods">
          <button type="button" aria-pressed={laneFilter.value === "all"} onClick={() => { laneFilter.value = "all"; }}>Everything</button>
          {LANES.map((lane) => (
            <button key={lane} type="button" aria-pressed={laneFilter.value === lane} disabled={!counts.value.get(lane)} onClick={() => { laneFilter.value = lane; }}>
              {LANE_LABELS[lane].en} <span class="count">{counts.value.get(lane) ?? 0}</span>
            </button>
          ))}
        <button type="button" aria-pressed={laneFilter.value === "fleeting"} onClick={() => { laneFilter.value = "fleeting"; }}>Gone in a month</button>
        </div>
      </div>
      {PHASES.map(({ phase, ko, rr, en, gloss }) => {
        const group = list.filter((entry) => entry.status.phase === phase);
        if (group.length === 0) return null;
        return (
          <div key={phase} class={`band band-${phase}`}>
            <header class="band-head">
              <h2><span lang="ko">{ko}</span> <span class="band-rr">{rr}</span></h2>
              <p><strong>{en}.</strong> {gloss} <span class="count">{group.length}</span></p>
            </header>
            <div class="tokens">
              {group.map((entry) => <Token key={entry.food.id} entry={entry} />)}
            </div>
          </div>
        );
      })}
      {list.length === 0 ? <p class="empty">Nothing in this lane on this day.</p> : null}
      {peek.value ? (
        <div class="peek" aria-hidden="true" style={{ left: peek.value.x, top: peek.value.y }}>
          <span class="print-ink" style={{ "--src": `url(/prints/${peek.value.id}.webp)`, aspectRatio: String(peek.value.ratio) }} />
        </div>
      ) : null}
    </section>
  );
}
