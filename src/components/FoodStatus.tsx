import { useEffect, useState } from "preact/hooks";
import type { FoodWindow } from "../data/schema.ts";
import { shortDate, todayInSeoul, type DayNum } from "../lib/dates.ts";
import { nextArrival, statusAt, type Phase } from "../lib/season.ts";

const PHASE_TEXT: Record<Phase, { ko: string; en: string }> = {
  first: { ko: "첫물", en: "Just in" },
  peak: { ko: "제철", en: "In season" },
  last: { ko: "끝물", en: "Last call" },
};

export function FoodStatus({ windows, builtOn }: { windows: readonly FoodWindow[]; builtOn: number }) {
  const [today, setToday] = useState(builtOn as DayNum);
  useEffect(() => setToday(todayInSeoul()), []);
  const status = statusAt(windows, today);
  if (status) {
    const text = PHASE_TEXT[status.phase];
    return (
      <p class="status on">
        <span class="status-ko" lang="ko">{text.ko}</span>
        <span>{text.en} today{status.label ? `: ${status.label.toLowerCase()}` : ""}. {status.daysLeft > 1 ? `${status.daysLeft} days left.` : "Last day."}</span>
      </p>
    );
  }
  const next = nextArrival(windows, today);
  if (next === null) return null;
  return (
    <p class="status">
      <span class="status-ko">D-{next - today}</span>
      <span>Not in season today. Back around {shortDate(next)}.</span>
    </p>
  );
}
