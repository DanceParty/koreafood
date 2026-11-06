import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { FIRST_DAY, LAST_DAY, termAt, termsOfYear } from "../lib/calendar.ts";
import { FOODS } from "../lib/client-data.ts";
import { dayOf, MONTHS_SHORT, shortDate, toParts, yearFraction, yearLength, type DayNum } from "../lib/dates.ts";
import { printedOn } from "../lib/palette.ts";
import { statusAt } from "../lib/season.ts";
import { day, setDay, setDayNow, settledDay, today } from "../lib/store.ts";
import { arcPath, layoutTracks, polar, trackStep, WHEEL, type Arc, type Track } from "../lib/wheel.ts";

const DAYS_PER_TURN = 365.2425;
const FRICTION = 0.955;
const MIN_SPEED = 0.03;

const asDay = (value: number) => Math.round(value) as DayNum;

function normalize(angle: number): number {
  if (angle > Math.PI) return angle - Math.PI * 2;
  if (angle < -Math.PI) return angle + Math.PI * 2;
  return angle;
}

function arcClass(track: Track, arc: Arc): string {
  const tier = track.headline ? " n" : track.food.tier === "known" ? " k" : "";
  const certainty = arc.mark === "est" ? " d" : arc.mark === "sourced" ? "" : " w";
  return `a${arc.kind === "peak" ? " p" : " s"}${tier}${certainty}`;
}

interface Hit {
  track: Track;
  x: number;
  y: number;
  touch?: boolean;
}

export function Wheel() {
  const wrap = useRef<HTMLDivElement>(null);
  const disc = useRef<SVGSVGElement>(null);
  const year = useComputed(() => toParts(day.value).year);
  const viewYear = year.value;
  const layout = useMemo(() => layoutTracks(FOODS, viewYear), [viewYear]);
  const months = useMemo(() => {
    const first = dayOf(viewYear, 1, 1);
    const length = yearLength(viewYear);
    return MONTHS_SHORT.map((label, index) => {
      const start = dayOf(viewYear, index + 1, 1);
      return { label, index, fraction: (start - first) / length };
    });
  }, [viewYear]);
  const terms = useMemo(() => {
    const first = dayOf(viewYear, 1, 1);
    const length = yearLength(viewYear);
    return termsOfYear(viewYear).map(({ term, start }) => ({ term, fraction: (start - first) / length }));
  }, [viewYear]);
  const [hit, setHit] = useState<Hit | null>(null);
  const spun = useSignal(false);

  const floatDay = useRef<number>(day.peek());
  const raf = useRef(0);
  const velocity = useRef(0);
  const tween = useRef<{ from: number; to: number; begin: number; length: number } | null>(null);

  const place = (value: number) => {
    const clamped = Math.min(LAST_DAY, Math.max(FIRST_DAY, value));
    floatDay.current = clamped;
    if (disc.current) disc.current.style.transform = `rotate(${-yearFraction(clamped) * 360}deg)`;
    setDay(asDay(clamped));
    return clamped;
  };

  const stop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    tween.current = null;
    velocity.current = 0;
  };

  const frame = (now: number) => {
    const active = tween.current;
    if (active) {
      const progress = Math.min(1, (now - active.begin) / active.length);
      const eased = 1 - (1 - progress) ** 4;
      place(active.from + (active.to - active.from) * eased);
      if (progress < 1) {
        raf.current = requestAnimationFrame(frame);
        return;
      }
      tween.current = null;
      setDayNow(asDay(active.to));
      raf.current = 0;
      return;
    }
    velocity.current *= FRICTION;
    place(floatDay.current + velocity.current);
    if (Math.abs(velocity.current) > MIN_SPEED) {
      raf.current = requestAnimationFrame(frame);
      return;
    }
    goTo(Math.round(floatDay.current), 260);
  };

  const goTo = (target: number, length = 900) => {
    cancelAnimationFrame(raf.current);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || length === 0) {
      place(target);
      setDayNow(asDay(target));
      return;
    }
    velocity.current = 0;
    tween.current = { from: floatDay.current, to: target, begin: performance.now(), length };
    raf.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    place(day.peek());
    const element = wrap.current;
    if (!element) return undefined;
    const onExternal = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "number") goTo(event.detail);
    };
    window.addEventListener("wheel:goto", onExternal);
    return () => {
      window.removeEventListener("wheel:goto", onExternal);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  useSignalEffect(() => {
    const value = day.value;
    if (!raf.current && Math.abs(value - floatDay.current) >= 1 && !drag.current) {
      place(value);
    }
  });

  useSignalEffect(() => {
    const current = settledDay.value;
    const root = disc.current;
    if (!root) return;
    const on = new Set(layout.tracks.filter((track) => statusAt(track.food.windows, current)).map((track) => track.food.id));
    root.querySelectorAll<SVGElement>("[data-id]").forEach((node) => {
      node.classList.toggle("on", on.has(node.dataset.id ?? ""));
    });
  });

  const drag = useRef<{ last: number; moved: number; time: number } | null>(null);
  const centerOf = () => {
    const box = wrap.current?.getBoundingClientRect();
    return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2, size: box.width } : null;
  };
  const angleOf = (event: PointerEvent) => {
    const center = centerOf();
    return center ? Math.atan2(event.clientY - center.y, event.clientX - center.x) : 0;
  };

  const hitAt = (event: PointerEvent): Hit | null => {
    const center = centerOf();
    if (!center) return null;
    const dx = event.clientX - center.x;
    const dy = event.clientY - center.y;
    const radius = (Math.hypot(dx, dy) * WHEEL.size) / center.size;
    if (radius < WHEEL.trackInner - 4 || radius > WHEEL.trackOuter + 4) return null;
    const angle = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2);
    const fraction = (((angle + yearFraction(floatDay.current)) % 1) + 1) % 1;
    const tolerance = Math.max(trackStep(layout.tracks) * 0.75, 3);
    let best: Track | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const track of layout.tracks) {
      const gap = Math.abs(track.radius - radius);
      if (gap > tolerance) continue;
      const within = track.arcs.some((arc) => {
        const offset = (((fraction - arc.start) % 1) + 1) % 1;
        return offset <= arc.sweep;
      });
      if (!within) continue;
      const score = gap - (track.food.tier === "national" ? 2 : 0);
      if (score < bestScore) {
        best = track;
        bestScore = score;
      }
    }
    const box = wrap.current?.getBoundingClientRect();
    return best && box ? { track: best, x: event.clientX - box.left, y: event.clientY - box.top } : null;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    spun.value = true;
    stop();
    wrap.current?.setPointerCapture(event.pointerId);
    drag.current = { last: angleOf(event), moved: 0, time: event.timeStamp };
  };

  const onMove = (event: PointerEvent) => {
    const active = drag.current;
    if (!active) {
      if (event.pointerType === "mouse") setHit(hitAt(event));
      return;
    }
    const angle = angleOf(event);
    const delta = normalize(angle - active.last);
    const days = -(delta / (Math.PI * 2)) * DAYS_PER_TURN;
    const elapsed = Math.max(1, event.timeStamp - active.time);
    velocity.current = velocity.current * 0.7 + ((days / elapsed) * 16) * 0.3;
    active.last = angle;
    active.time = event.timeStamp;
    active.moved += Math.abs(delta) * 300;
    if (active.moved > 3) setHit(null);
    place(floatDay.current + days);
  };

  const rimDate = (event: PointerEvent): number | null => {
    const center = centerOf();
    if (!center) return null;
    const dx = event.clientX - center.x;
    const dy = event.clientY - center.y;
    const radius = (Math.hypot(dx, dy) * WHEEL.size) / center.size;
    if (radius < WHEEL.rimInner || radius > WHEEL.rimOuter + 6) return null;
    const angle = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2);
    const fraction = (((angle + yearFraction(floatDay.current)) % 1) + 1) % 1;
    return dayOf(viewYear, 1, 1) + Math.floor(fraction * yearLength(viewYear));
  };

  const onUp = (event: PointerEvent) => {
    const active = drag.current;
    drag.current = null;
    if (!active) return;
    if (active.moved <= 3) {
      const rim = rimDate(event);
      if (rim !== null) {
        goTo(rim);
        return;
      }
      const target = hitAt(event);
      if (event.pointerType !== "mouse") {
        setHit(target ? { ...target, touch: true } : null);
      } else if (target) {
        location.href = `/food/${target.track.food.id}/`;
      }
      return;
    }
    if (event.timeStamp - active.time > 80) velocity.current = 0;
    raf.current = requestAnimationFrame(frame);
  };

  const onKey = (event: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 15, PageDown: -15 };
    const step = steps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      stop();
      goTo(day.peek() + step, 220);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(today.peek());
    }
  };

  const spot = useComputed(() => termAt(day.value));
  const ink = useComputed(() => printedOn(day.value).ink);
  const fontStep = trackStep(layout.tracks);

  return (
    <div class="wheel-frame">
      <div
        ref={wrap}
        class="wheel"
        role="slider"
        tabIndex={0}
        aria-label="Day of the year. Drag or use arrow keys to move through the year."
        aria-valuemin={FIRST_DAY}
        aria-valuemax={LAST_DAY}
        aria-valuenow={day.value}
        aria-valuetext={`${shortDate(day.value)}, ${spot.value.term.en}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => { drag.current = null; }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") setHit(null); }}
        onKeyDown={onKey}
      >
        <svg ref={disc} class="disc" viewBox={`0 0 ${WHEEL.size} ${WHEEL.size}`} aria-hidden="true">
          <circle class="rim-line" cx={WHEEL.center} cy={WHEEL.center} r={WHEEL.rimInner} />
          <circle class="rim-line" cx={WHEEL.center} cy={WHEEL.center} r={WHEEL.rimOuter} />
          {months.map((month) => {
            const inner = polar(WHEEL.rimInner, month.fraction);
            const outer = polar(WHEEL.rimOuter, month.fraction);
            const label = polar(WHEEL.rimOuter - 21, month.fraction + 1 / 24);
            return (
              <g key={month.label}>
                <line class="month-tick" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
                <text class="month-label" x={label.x} y={label.y} transform={`rotate(${(month.fraction + 1 / 24) * 360} ${label.x} ${label.y})`}>
                  {month.index + 1}<tspan class="wol">월</tspan>
                </text>
              </g>
            );
          })}
          {terms.map(({ term, fraction }) => {
            const inner = polar(WHEEL.rimInner, fraction);
            const outer = polar(WHEEL.rimInner + 8, fraction);
            const label = polar(WHEEL.rimInner + 16, fraction);
            return (
              <g key={term.key}>
                <line class="term-tick" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
                <text class="term-label" x={label.x + 0} y={label.y} transform={`rotate(${fraction * 360} ${label.x} ${label.y})`}>{term.ko}</text>
              </g>
            );
          })}
          <g class="arcs">
            {layout.tracks.flatMap((track) =>
              track.arcs.map((arc, index) => (
                <path
                  key={`${track.food.id}-${index}`}
                  class={arcClass(track, arc)}
                  data-id={track.food.id}
                  d={arcPath(track.radius, arc.start, arc.sweep)}
                  stroke-width={arc.kind === "peak" ? (track.headline ? 13.6 : Math.max(1.1, fontStep * 0.74)) : track.headline ? 1.6 : 0.8}
                />
              )))}
          </g>
          <g class="arc-labels">
            {layout.tracks.filter((track) => track.headline).flatMap((track) =>
              track.arcs.filter((arc) => arc.kind === "peak" && arc.sweep > 0.018).slice(0, 1).map((arc) => {
                const pathId = `lbl-${track.food.id}`;
                return (
                  <g key={pathId} data-id={track.food.id}>
                    <path id={pathId} d={arcPath(track.radius - 4.2, arc.start, arc.sweep)} fill="none" />
                    <text class="arc-label"><textPath href={`#${pathId}`} startOffset="9">{track.food.ko}</textPath></text>
                  </g>
                );
              }))}
          </g>
        </svg>
        <div class="wheel-center">
          <p class="center-term" lang="ko">{spot.value.term.ko}</p>
          <p class="center-en">{spot.value.term.en}</p>
          <p class="center-ink">Printed on <span lang="ko">{ink.value.ko}</span> {ink.value.en}</p>
          {spun.value ? null : <p class="center-hint">Drag to spin the year</p>}
        </div>
        <svg class="pointer" viewBox="0 0 40 60" aria-hidden="true"><path d="M20 58 L2 2 H38 Z" /></svg>
        {hit ? (
          <a
            class={`wheel-tip${hit.touch ? " touch" : ""}`}
            href={`/food/${hit.track.food.id}/`}
            style={{ left: hit.x, top: hit.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <strong lang="ko">{hit.track.food.ko}</strong> {hit.track.food.en}
          </a>
        ) : null}
      </div>
    </div>
  );
}

