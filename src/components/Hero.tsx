import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { lunarOf, termAt } from "../lib/calendar.ts";
import { MAIN_FOODS, upcoming } from "../lib/client-data.ts";
import { monthName, shortDate, toIso, toParts, WEEKDAYS, WEEKDAYS_KO, type DayNum } from "../lib/dates.ts";
import { headlineRank } from "../lib/headliners.ts";
import { itIs } from "../lib/korean.ts";
import { inSeason, type InSeason } from "../lib/season.ts";
import { day, openWhatElse, settledDay, today } from "../lib/store.ts";

const CYCLE_MS = 5200;
const PICKS = 6;

const HOLIDAY_LEAD_DAYS = 2;

/** Dishes tied to a holiday or solar term in the next couple of days. */
function holidayFoods(from: DayNum): Set<string> {
  const near = upcoming(from, 6).filter((entry) => entry.on - from <= HOLIDAY_LEAD_DAYS && entry.event.kind !== "law" && entry.event.kind !== "festival");
  return new Set(near.flatMap((entry) => entry.event.foods));
}

/** A holiday dish on its holiday beats everything, then foods at their peak, then the tail ends of a season. */
function pickOrder(entry: InSeason, holiday: ReadonlySet<string>): number {
  const rank = headlineRank(entry.food.id);
  if (holiday.has(entry.food.id)) return rank - 1000;
  return (entry.status.phase === "peak" ? 0 : 100) + rank;
}

export function Hero() {
  const parts = useComputed(() => toParts(day.value));
  const lunar = useComputed(() => lunarOf(day.value));
  const spot = useComputed(() => termAt(day.value));
  const holiday = useComputed(() => upcoming(day.value, 3).find((entry) => entry.on === day.value && entry.event.kind !== "law"));
  const picks = useComputed(() => {
    const holiday = holidayFoods(settledDay.value);
    return inSeason(MAIN_FOODS, settledDay.value)
      .sort((a, b) => pickOrder(a, holiday) - pickOrder(b, holiday) || b.score - a.score)
      .slice(0, PICKS);
  });
  const turn = useSignal(0);
  const list = picks.value;
  const pick = list.length > 0 ? list[turn.value % list.length] : undefined;
  const copied = useSignal(false);

  const share = async () => {
    const url = new URL(location.href);
    url.searchParams.set("d", toIso(day.peek()));
    const title = `이맘때면 ${pick ? itIs(pick.food.ko) : ""}`;
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url: url.href }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url.href);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1800);
  };

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => { turn.value += 1; }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const { year, month, date, weekday } = parts.value;
  const red = weekday === 0 || Boolean(holiday.value);
  const moon = lunar.value;
  const isToday = day.value === today.value;

  return (
    <section class="hero" aria-labelledby="hero-line">
      <div class="leaf">
        <p class="leaf-top">
          <span>{year}</span>
          <span lang="ko">{month}월</span>
          <span>{monthName(month)}</span>
        </p>
        <p class={`leaf-num${red ? " red" : ""}`}>{date}</p>
        <p class="leaf-side">
          <span><span lang="ko">{WEEKDAYS_KO[weekday]}요일</span> {WEEKDAYS[weekday]}</span>
          {moon ? <span>음력 {moon.leap ? "윤" : ""}{moon.month}.{moon.date}</span> : null}
          <span>{isToday ? "Today in Seoul" : `${spot.value.nextStart - day.value} days to ${spot.value.next.rr}`}</span>
          <span class="leaf-term"><span lang="ko">{spot.value.term.ko}</span> {spot.value.term.en}</span>
        </p>
        {holiday.value ? <p class="leaf-event"><span lang="ko">{holiday.value.event.ko}</span> {holiday.value.event.en}</p> : null}
      </div>

      <h1 id="hero-line" class="line">
        <span class="line-ko" lang="ko" style={{ "--len": Math.max(5, (pick?.food.ko.length ?? 2) + 3) }}>
          <span class="line-lead">이맘때면</span>
          {pick ? (
            <a key={pick.food.id} class="line-food" href={`/food/${pick.food.id}/`}>{itIs(pick.food.ko)}</a>
          ) : <span class="line-food">뭐지?</span>}
        </span>
        <span class="line-en">
          Around this time of year, it's {pick ? <a href={`/food/${pick.food.id}/`}>{pick.food.phrase ?? pick.food.en.toLowerCase()}</a> : "anyone's guess"}.
        </span>
      </h1>
      <button type="button" class="line-next" onClick={openWhatElse}>
        Or what else? <span lang="ko">또 뭐 있어?</span>
      </button>
      <button type="button" class="share" onClick={share}>{copied.value ? "Link copied" : "Share this day"}</button>
      {!isToday ? (
        <button type="button" class="back-today" onClick={() => window.dispatchEvent(new CustomEvent("wheel:goto", { detail: today.value }))}>
          Back to today, {shortDate(today.value)}
        </button>
      ) : null}
      <p class="line-what">Korea's food year on a wheel. Spin it to any day.</p>
    </section>
  );
}
