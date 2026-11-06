import data from "../data/calendar.json";
import type { Anchor } from "../data/schema.ts";
import { addDays, dayOf, parseIso, toIso, toParts, type DayNum } from "./dates.ts";

export const FIRST_DAY = dayOf(data.firstYear, 1, 1);
export const LAST_DAY = dayOf(data.lastYear, 12, 31);

const years: Record<string, Record<string, string> | undefined> = data.years;

const coveredYear = (year: number) => Math.min(data.lastYear, Math.max(data.firstYear, year));

/** The date of a solar term or holiday in a year. Years outside the table reuse the nearest year's month and day. */
export function anchorDay(anchor: Anchor, year: number): DayNum {
  const covered = coveredYear(year);
  const iso = years[covered]?.[anchor];
  if (!iso) throw new Error(`calendar has no ${anchor} in ${covered}`);
  const { month, date } = toParts(parseIso(iso));
  return year === covered ? parseIso(iso) : dayOf(year, month, date);
}

export interface SolarTerm {
  key: Anchor;
  ko: string;
  rr: string;
  en: string;
}

/** The 24 절기 in calendar order, starting from January. */
export const SOLAR_TERMS: readonly SolarTerm[] = [
  { key: "sohan", ko: "소한", rr: "Sohan", en: "Small cold" },
  { key: "daehan", ko: "대한", rr: "Daehan", en: "Great cold" },
  { key: "ipchun", ko: "입춘", rr: "Ipchun", en: "Spring begins" },
  { key: "usu", ko: "우수", rr: "Usu", en: "Rain water" },
  { key: "gyeongchip", ko: "경칩", rr: "Gyeongchip", en: "Insects wake" },
  { key: "chunbun", ko: "춘분", rr: "Chunbun", en: "Spring equinox" },
  { key: "cheongmyeong", ko: "청명", rr: "Cheongmyeong", en: "Clear and bright" },
  { key: "gogu", ko: "곡우", rr: "Gogu", en: "Grain rain" },
  { key: "ipha", ko: "입하", rr: "Ipha", en: "Summer begins" },
  { key: "soman", ko: "소만", rr: "Soman", en: "Grain fills" },
  { key: "mangjong", ko: "망종", rr: "Mangjong", en: "Grain in ear" },
  { key: "haji", ko: "하지", rr: "Haji", en: "Summer solstice" },
  { key: "soseo", ko: "소서", rr: "Soseo", en: "Small heat" },
  { key: "daeseo", ko: "대서", rr: "Daeseo", en: "Great heat" },
  { key: "ipchu", ko: "입추", rr: "Ipchu", en: "Autumn begins" },
  { key: "cheoseo", ko: "처서", rr: "Cheoseo", en: "Heat ends" },
  { key: "baengno", ko: "백로", rr: "Baengno", en: "White dew" },
  { key: "chubun", ko: "추분", rr: "Chubun", en: "Autumn equinox" },
  { key: "hallo", ko: "한로", rr: "Hallo", en: "Cold dew" },
  { key: "sanggang", ko: "상강", rr: "Sanggang", en: "Frost falls" },
  { key: "ipdong", ko: "입동", rr: "Ipdong", en: "Winter begins" },
  { key: "soseol", ko: "소설", rr: "Soseol", en: "Light snow" },
  { key: "daeseol", ko: "대설", rr: "Daeseol", en: "Heavy snow" },
  { key: "dongji", ko: "동지", rr: "Dongji", en: "Winter solstice" },
];

export interface TermSpot {
  index: number;
  term: SolarTerm;
  start: DayNum;
  next: SolarTerm;
  nextStart: DayNum;
}

/** The solar term a day falls in, with its start and the following term. */
export function termAt(day: DayNum): TermSpot {
  const { year } = toParts(day);
  const count = SOLAR_TERMS.length;
  const dated = [...termsOfYear(year - 1).slice(-1), ...termsOfYear(year), ...termsOfYear(year + 1).slice(0, 1)];
  let at = 0;
  for (let index = 0; index < dated.length; index += 1) {
    const entry = dated[index];
    if (entry && entry.start <= day) at = index;
  }
  const current = dated[at];
  const following = dated[at + 1];
  if (!current || !following) throw new Error(`no solar term for ${toIso(day)}`);
  return {
    index: (at - 1 + count) % count,
    term: current.term,
    start: current.start,
    next: following.term,
    nextStart: following.start,
  };
}

export function termsOfYear(year: number): { term: SolarTerm; start: DayNum }[] {
  return SOLAR_TERMS.map((term) => ({ term, start: anchorDay(term.key, year) }));
}

export interface LunarDate {
  month: number;
  date: number;
  leap: boolean;
}

const lunarStarts: readonly { start: DayNum; month: number; leap: boolean }[] = data.lunarMonths.flatMap((row) => {
  const [iso, month, leap] = row;
  return typeof iso === "string" && typeof month === "number"
    ? [{ start: parseIso(iso), month, leap: leap === 1 }]
    : [];
});

export function lunarOf(day: DayNum): LunarDate | null {
  let low = 0;
  let high = lunarStarts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const entry = lunarStarts[mid];
    if (entry && entry.start <= day) low = mid;
    else high = mid - 1;
  }
  const entry = lunarStarts[low];
  if (!entry || entry.start > day || low === lunarStarts.length - 1) return null;
  return { month: entry.month, date: addDays(day, -entry.start) + 1, leap: entry.leap };
}
