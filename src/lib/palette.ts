import { termAt } from "./calendar.ts";
import type { DayNum } from "./dates.ts";

export interface Ink {
  /** Food or thing the colour is named after, in Hangul and English. */
  ko: string;
  en: string;
  paper: string;
  ink: string;
  accent: string;
}

/** One ink per 절기, in SOLAR_TERMS order. The site reprints itself in the current one. */
export const INKS: readonly Ink[] = [
  { ko: "귤", en: "mandarin", paper: "#f8b45a", ink: "#2b1405", accent: "#a8260a" },
  { ko: "딸기", en: "strawberry", paper: "#f6a3ae", ink: "#3a0a17", accent: "#9c0d29" },
  { ko: "봄동", en: "spring cabbage", paper: "#cfe07a", ink: "#1f2b0a", accent: "#3b6410" },
  { ko: "미나리", en: "water dropwort", paper: "#9edba6", ink: "#0b2e1c", accent: "#0c5c35" },
  { ko: "쑥", en: "mugwort", paper: "#bccb8f", ink: "#222c14", accent: "#3f5c1c" },
  { ko: "개나리", en: "forsythia", paper: "#f7df5e", ink: "#2b2608", accent: "#975007" },
  { ko: "진달래", en: "azalea", paper: "#f5a8cd", ink: "#3a0f2a", accent: "#970f57" },
  { ko: "우전", en: "first-flush tea", paper: "#b7dfa8", ink: "#10301c", accent: "#176338" },
  { ko: "참외", en: "Korean melon", paper: "#f6e36b", ink: "#2b2a08", accent: "#7a5a00" },
  { ko: "멍게", en: "sea squirt", paper: "#f7a98c", ink: "#3c1309", accent: "#982408" },
  { ko: "매실", en: "green plum", paper: "#cfe38a", ink: "#20300c", accent: "#446c0e" },
  { ko: "장마", en: "monsoon", paper: "#a9d3de", ink: "#0b2f3b", accent: "#0b5a72" },
  { ko: "수박", en: "watermelon", paper: "#f6a0a0", ink: "#0c3320", accent: "#9c1022" },
  { ko: "복숭아", en: "peach", paper: "#fbb9a0", ink: "#40190f", accent: "#a82c12" },
  { ko: "옥수수", en: "waxy corn", paper: "#f6d56a", ink: "#33260a", accent: "#8f4c00" },
  { ko: "포도", en: "grape", paper: "#c9b0e3", ink: "#241138", accent: "#4c2288" },
  { ko: "밤", en: "chestnut", paper: "#d9b68e", ink: "#2e1a0a", accent: "#6c3310" },
  { ko: "햅쌀", en: "new rice", paper: "#ecdf9a", ink: "#2f280c", accent: "#7a5b00" },
  { ko: "감", en: "persimmon", paper: "#f7a060", ink: "#371505", accent: "#982a00" },
  { ko: "단풍", en: "maple", paper: "#f0947c", ink: "#300e08", accent: "#7f1608" },
  { ko: "은행", en: "ginkgo", paper: "#f5d94e", ink: "#2a2406", accent: "#9c3a06" },
  { ko: "굴", en: "oyster", paper: "#c9ced6", ink: "#171d26", accent: "#3b4b60" },
  { ko: "방어", en: "yellowtail", paper: "#a8c8df", ink: "#0b1f33", accent: "#154670" },
  { ko: "팥", en: "red bean", paper: "#e4a9a2", ink: "#2c0c12", accent: "#731422" },
];

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (index: 0 | 1 | 2) => Math.round(a[index] + (b[index] - a[index]) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

const BLEND_DAYS = 3;

export interface Printed {
  ink: Ink;
  vars: { paper: string; ink: string; accent: string };
}

/** The ink for a day. It holds through the term and blends into the next over the last few days. */
export function printedOn(day: DayNum): Printed {
  const spot = termAt(day);
  const current = INKS[spot.index];
  const next = INKS[(spot.index + 1) % INKS.length];
  if (!current || !next) throw new Error(`no ink for term ${spot.index}`);
  const left = spot.nextStart - day;
  const amount = left <= BLEND_DAYS ? (BLEND_DAYS + 1 - left) / (BLEND_DAYS + 1) : 0;
  return {
    ink: current,
    vars: {
      paper: mix(current.paper, next.paper, amount),
      ink: mix(current.ink, next.ink, amount),
      accent: mix(current.accent, next.accent, amount),
    },
  };
}

export function applyInk(target: HTMLElement, printed: Printed): void {
  target.style.setProperty("--paper", printed.vars.paper);
  target.style.setProperty("--ink", printed.vars.ink);
  target.style.setProperty("--accent", printed.vars.accent);
}
