import { useComputed, useSignal } from "@preact/signals";
import { LANES } from "../data/constants.ts";
import { isMain } from "../data/main-list.ts";
import type { Lane } from "../data/schema.ts";
import { FOODS, LANE_LABELS } from "../lib/client-data.ts";
import { dayOf, shortDate, toParts, type DayNum } from "../lib/dates.ts";
import { inSeason, isFleeting, type InSeason, type Phase } from "../lib/season.ts";
import { day, laneFilter, setDayNow, settledDay, whatElseOpen } from "../lib/store.ts";

const PHASE_ORDER: Record<Phase, number> = { peak: 0, first: 1, last: 2 };
const LAST_CALL_DAYS = 14;

interface Peek {
  id: string;
  ratio: number;
  x: number;
  y: number;
}

const printData = (entry: InSeason) => (entry.food.print ? `${entry.food.id}:${entry.food.print}` : undefined);

function MainToken({ entry }: { entry: InSeason }) {
  const { food, status } = entry;
  const uncertain = food.windows[0]?.mark === "est";
  return (
    <a class={`token t-${food.tier === "national" ? "national" : "known"}`} href={`/food/${food.id}/`} data-print={printData(entry)}>
      <span class="token-ko" lang="ko">{food.ko}{uncertain ? <sup title="Estimated window">?</sup> : null}</span>
      <span class="token-en">{food.en}</span>
      {status.phase === "first" ? <span class="token-tag"><span lang="ko">첫물</span> Just in</span> : null}
      {status.phase === "last" ? (
        <span class="token-tag">
          <span lang="ko">끝물</span> {status.daysLeft <= LAST_CALL_DAYS ? `${status.daysLeft} days left` : "Last call"}
        </span>
      ) : null}
    </a>
  );
}

function SmallToken({ entry }: { entry: InSeason }) {
  const { food } = entry;
  return (
    <a class="token t-local" href={`/food/${food.id}/`} data-print={printData(entry)}>
      <span class="token-ko" lang="ko">{food.ko}{food.windows[0]?.mark === "est" ? <sup title="Estimated window">?</sup> : null}</span>
      <span class="token-en">{food.en}</span>
    </a>
  );
}

function WhatElse({ rest, count }: { rest: readonly InSeason[]; count: number }) {
  const filter = laneFilter.value;
  const { year } = toParts(settledDay.value);
  const shown = rest.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "fleeting") return isFleeting(entry.food, year);
    return entry.food.lane === filter;
  });
  const totals = new Map<Lane, number>();
  for (const entry of rest) totals.set(entry.food.lane, (totals.get(entry.food.lane) ?? 0) + 1);
  const lanes = LANES.filter((lane) => shown.some((entry) => entry.food.lane === lane));

  return (
    <div id="else-body">
      <div class="filters" role="group" aria-label="Filter foods">
        <button type="button" aria-pressed={filter === "all"} onClick={() => { laneFilter.value = "all"; }}>Everything <span class="count">{count}</span></button>
        {LANES.map((lane) => (
          <button key={lane} type="button" aria-pressed={filter === lane} disabled={!totals.get(lane)} onClick={() => { laneFilter.value = lane; }}>
            {LANE_LABELS[lane].en} <span class="count">{totals.get(lane) ?? 0}</span>
          </button>
        ))}
        <button type="button" aria-pressed={filter === "fleeting"} onClick={() => { laneFilter.value = "fleeting"; }}>Gone in a month</button>
      </div>
      {lanes.map((lane) => (
        <div key={lane} class="lane-block">
          <h3>{LANE_LABELS[lane].en}</h3>
          <div class="tokens">
            {shown.filter((entry) => entry.food.lane === lane).map((entry) => <SmallToken key={entry.food.id} entry={entry} />)}
          </div>
        </div>
      ))}
      {shown.length === 0 ? <p class="empty">Nothing here on this day.</p> : null}
    </div>
  );
}

export function Wall() {
  const peek = useSignal<Peek | null>(null);
  const all = useComputed(() => inSeason(FOODS, settledDay.value));

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

  const main = all.value
    .filter((entry) => isMain(entry.food.id))
    .sort((a, b) => PHASE_ORDER[a.status.phase] - PHASE_ORDER[b.status.phase] || b.score - a.score);
  const rest = all.value.filter((entry) => !isMain(entry.food.id));
  const { year } = toParts(day.value);
  const open = whatElseOpen.value;

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
      </div>

      <div class="band">
        <header class="band-head">
          <h2><span lang="ko">제철</span> <span class="band-rr">jecheol</span></h2>
          <p><strong>In season.</strong> What people are actually talking about.</p>
        </header>
        <div class="tokens tokens-main">
          {main.map((entry) => <MainToken key={entry.food.id} entry={entry} />)}
        </div>
      </div>

      <section id="what-else" class="else">
        <button type="button" class="else-toggle" aria-expanded={open} aria-controls="else-body" onClick={() => { whatElseOpen.value = !open; }}>
          <span class="else-ko" lang="ko">또 뭐 있어?</span>
          <span class="else-en">What else</span>
          <span class="count">{rest.length} regional and insider foods</span>
          <span class="else-sign" aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {open ? <WhatElse rest={rest} count={rest.length} /> : null}
      </section>

      {peek.value ? (
        <div class="peek" aria-hidden="true" style={{ left: peek.value.x, top: peek.value.y }}>
          <span class="print-ink" style={{ "--src": `url(/prints/${peek.value.id}.webp)`, aspectRatio: String(peek.value.ratio) }} />
        </div>
      ) : null}
    </section>
  );
}
