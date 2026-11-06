import { signal } from "@preact/signals";
import type { Lane } from "../data/schema.ts";
import { todayInSeoul, type DayNum } from "./dates.ts";

/** The day under the pointer. Changes on every whole day the dial crosses. */
export const day = signal<DayNum>(todayInSeoul());
/** Same day, held back while the dial spins, for anything expensive to redraw. */
export const settledDay = signal<DayNum>(day.peek());
export const today = signal<DayNum>(todayInSeoul());
export const laneFilter = signal<Lane | "all" | "fleeting">("all");
export const whatElseOpen = signal(false);

export function openWhatElse(): void {
  whatElseOpen.value = true;
  requestAnimationFrame(() => document.getElementById("what-else")?.scrollIntoView());
}

let timer: ReturnType<typeof setTimeout> | undefined;

export function setDay(next: DayNum): void {
  if (next === day.peek()) return;
  day.value = next;
  clearTimeout(timer);
  timer = setTimeout(() => {
    settledDay.value = next;
  }, 70);
}

export function setDayNow(next: DayNum): void {
  clearTimeout(timer);
  day.value = next;
  settledDay.value = next;
}
