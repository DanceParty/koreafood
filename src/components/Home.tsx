import { useEffect } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { parseIso, toIso, todayInSeoul, type DayNum } from "../lib/dates.ts";
import { applyInk, printedOn } from "../lib/palette.ts";
import { day, setDayNow, settledDay, today } from "../lib/store.ts";
import { Hero } from "./Hero.tsx";
import { Upcoming } from "./Upcoming.tsx";
import { Wall } from "./Wall.tsx";
import { Weather } from "./Weather.tsx";
import { Wheel } from "./Wheel.tsx";

function dayFromUrl(): DayNum | null {
  const value = new URLSearchParams(location.search).get("d");
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseIso(value) : null;
}

export function Home({ builtOn }: { builtOn: number }) {
  if (typeof window === "undefined") {
    day.value = builtOn as DayNum;
    settledDay.value = builtOn as DayNum;
    today.value = builtOn as DayNum;
  }

  useEffect(() => {
    const now = todayInSeoul();
    today.value = now;
    setDayNow(dayFromUrl() ?? now);
  }, []);

  useSignalEffect(() => {
    applyInk(document.documentElement, printedOn(day.value));
  });

  useSignalEffect(() => {
    const current = settledDay.value;
    const url = new URL(location.href);
    if (current === today.value) url.searchParams.delete("d");
    else url.searchParams.set("d", toIso(current));
    history.replaceState(null, "", url);
  });

  return (
    <main class="home">
      <div class="stage">
        <Weather />
        <Hero />
        <Wheel />
      </div>
      <Wall />
      <Upcoming />
    </main>
  );
}
