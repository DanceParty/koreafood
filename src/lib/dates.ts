export type DayNum = number & { readonly __brand: "DayNum" };

const DAY_MS = 86_400_000;
const SEOUL_OFFSET_MS = 9 * 3_600_000;

const asDay = (value: number) => value as DayNum;

export const dayOf = (year: number, month: number, date: number): DayNum =>
  asDay(Math.floor(Date.UTC(year, month - 1, date) / DAY_MS));

export const addDays = (day: DayNum, delta: number): DayNum => asDay(day + delta);

export function parseIso(iso: string): DayNum {
  const [year = NaN, month = NaN, date = NaN] = iso.split("-").map(Number);
  return dayOf(year, month, date);
}

export function toParts(day: DayNum) {
  const value = new Date(day * DAY_MS);
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    date: value.getUTCDate(),
    weekday: value.getUTCDay(),
  };
}

export function toIso(day: DayNum): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export const todayInSeoul = (now: Date = new Date()): DayNum =>
  asDay(Math.floor((now.getTime() + SEOUL_OFFSET_MS) / DAY_MS));

export const yearLength = (year: number): number =>
  dayOf(year + 1, 1, 1) - dayOf(year, 1, 1);

/** Position inside the year, 0 at Jan 1 midnight, approaching 1 at Dec 31. Accepts fractional days. */
export function yearFraction(day: number): number {
  const { year } = toParts(asDay(Math.floor(day)));
  return (day - dayOf(year, 1, 1)) / yearLength(year);
}

export function clampDay(day: number, min: DayNum, max: DayNum): number {
  return Math.min(max, Math.max(min, day));
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function shortDate(day: DayNum): string {
  const { month, date } = toParts(day);
  return `${MONTHS_SHORT[month - 1] ?? ""} ${date}`;
}

/** "Early Nov", "Mid Mar", "Late Oct" for a calendar date. */
export function looseDate(mmdd: string): string {
  const [month = 1, date = 1] = mmdd.split("-").map(Number);
  const part = date <= 10 ? "Early" : date <= 20 ? "Mid" : "Late";
  return `${part} ${MONTHS_SHORT[month - 1] ?? ""}`;
}
