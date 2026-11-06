import { writeFileSync } from "node:fs";
import { MakeTime, SearchSunLongitude } from "astronomy-engine";
import KoreanLunarCalendar from "korean-lunar-calendar";

const FIRST_YEAR = 2026;
const LAST_YEAR = 2036;
const DAY_MS = 86_400_000;

const TERMS: readonly (readonly [string, number])[] = [
  ["sohan", 285], ["daehan", 300], ["ipchun", 315], ["usu", 330], ["gyeongchip", 345], ["chunbun", 0],
  ["cheongmyeong", 15], ["gogu", 30], ["ipha", 45], ["soman", 60], ["mangjong", 75], ["haji", 90],
  ["soseo", 105], ["daeseo", 120], ["ipchu", 135], ["cheoseo", 150], ["baengno", 165], ["chubun", 180],
  ["hallo", 195], ["sanggang", 210], ["ipdong", 225], ["soseol", 240], ["daeseol", 255], ["dongji", 270],
];

const SUNEUNG_KNOWN: Readonly<Record<number, string>> = { 2026: "2026-11-19" };

const utc = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function termDate(year: number, longitude: number): number {
  const found = SearchSunLongitude(longitude, MakeTime(new Date(Date.UTC(year, 0, 1))), 366);
  if (!found) throw new Error(`no solar term ${longitude} in ${year}`);
  const kst = found.date.getTime() + 9 * 3_600_000;
  const date = new Date(kst);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** 0 = 甲子. 2000-01-01 is 戊午 (54). */
function sexagenaryIndex(ms: number): number {
  const days = Math.round((ms - Date.UTC(2000, 0, 1)) / DAY_MS);
  return (((54 + days) % 60) + 60) % 60;
}
const stem = (ms: number) => sexagenaryIndex(ms) % 10;
const branch = (ms: number) => sexagenaryIndex(ms) % 12;
const GYEONG = 6;
const O_HORSE = 6;
const MI_SHEEP = 7;

function nthDayAfter(from: number, n: number, match: (ms: number) => boolean): number {
  let cursor = from;
  let count = 0;
  while (count < n) {
    cursor += DAY_MS;
    if (match(cursor)) count += 1;
  }
  return cursor;
}

function lunarToSolar(year: number, month: number, day: number): number {
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setLunarDate(year, month, day, false)) throw new Error(`bad lunar ${year}-${month}-${day}`);
  const solar = calendar.getSolarCalendar();
  return utc(solar.year, solar.month, solar.day);
}

function leapMonthOf(year: number): number | null {
  for (let month = 1; month <= 12; month += 1) {
    const calendar = new KoreanLunarCalendar();
    if (calendar.setLunarDate(year, month, 1, true)) return month;
  }
  return null;
}

function lunarMonths(year: number) {
  const leap = leapMonthOf(year);
  const months: { start: number; month: number; leap: boolean }[] = [];
  for (let month = 1; month <= 12; month += 1) {
    months.push({ start: lunarToSolar(year, month, 1), month, leap: false });
    if (month === leap) {
      const calendar = new KoreanLunarCalendar();
      calendar.setLunarDate(year, month, 1, true);
      const solar = calendar.getSolarCalendar();
      months.push({ start: utc(solar.year, solar.month, solar.day), month, leap: true });
    }
  }
  return months;
}

function anchorsFor(year: number): Record<string, string> {
  const terms = new Map<string, number>();
  for (const [key, longitude] of TERMS) {
    terms.set(key, termDate(year, longitude));
  }
  const need = (key: string) => {
    const value = terms.get(key);
    if (value === undefined) throw new Error(`missing term ${key}`);
    return value;
  };

  const out = new Map<string, number>(terms);
  out.set("seollal", lunarToSolar(year, 1, 1));
  out.set("daeboreum", lunarToSolar(year, 1, 15));
  out.set("samjinnal", lunarToSolar(year, 3, 3));
  out.set("chopail", lunarToSolar(year, 4, 8));
  out.set("dano", lunarToSolar(year, 5, 5));
  out.set("yudu", lunarToSolar(year, 6, 15));
  out.set("chilseok", lunarToSolar(year, 7, 7));
  out.set("baekjung", lunarToSolar(year, 7, 15));
  out.set("chuseok", lunarToSolar(year, 8, 15));
  out.set("jungyang", lunarToSolar(year, 9, 9));

  const prevDongji = termDate(year - 1, 270);
  out.set("hansik", prevDongji + 105 * DAY_MS);
  out.set("napil", nthDayAfter(prevDongji, 3, (ms) => branch(ms) === MI_SHEEP));

  const isGyeong = (ms: number) => stem(ms) === GYEONG;
  out.set("chobok", nthDayAfter(need("haji"), 3, isGyeong));
  out.set("jungbok", nthDayAfter(need("haji"), 4, isGyeong));
  out.set("malbok", nthDayAfter(need("ipchu"), 1, isGyeong));

  const isHorse = (ms: number) => branch(ms) === O_HORSE;
  const lunarTenthStart = lunarToSolar(year, 10, 1);
  out.set("sangdal", lunarTenthStart);
  out.set("malnal-winter", nthDayAfter(lunarTenthStart - DAY_MS, 1, isHorse));
  out.set("malnal-spring", nthDayAfter(lunarToSolar(year, 1, 15), 1, isHorse));

  const known = SUNEUNG_KNOWN[year];
  if (known) {
    out.set("suneung", Date.parse(`${known}T00:00:00Z`));
  } else {
    const firstNov = utc(year, 11, 1);
    const firstThu = firstNov + ((4 - new Date(firstNov).getUTCDay() + 7) % 7) * DAY_MS;
    out.set("suneung", firstThu + 14 * DAY_MS);
  }

  return Object.fromEntries([...out].map(([key, ms]) => [key, iso(ms)]));
}

const years: Record<string, Record<string, string>> = {};
for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) years[year] = anchorsFor(year);

const months = [];
for (let year = FIRST_YEAR - 1; year <= LAST_YEAR; year += 1) {
  for (const entry of lunarMonths(year)) months.push([iso(entry.start), entry.month, entry.leap ? 1 : 0]);
}
months.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

const check: readonly (readonly [number, string, string])[] = [
  [2026, "ipdong", "2026-11-07"], [2026, "dongji", "2026-12-22"], [2026, "chuseok", "2026-09-25"],
  [2026, "sangdal", "2026-11-09"], [2026, "malnal-winter", "2026-11-16"],
  [2027, "seollal", "2027-02-07"], [2027, "daeboreum", "2027-02-21"], [2027, "ipchun", "2027-02-04"],
  [2027, "gyeongchip", "2027-03-06"], [2027, "samjinnal", "2027-04-09"], [2027, "cheongmyeong", "2027-04-05"],
  [2027, "hansik", "2027-04-06"], [2027, "gogu", "2027-04-20"], [2027, "ipha", "2027-05-06"],
  [2027, "chopail", "2027-05-13"], [2027, "soman", "2027-05-21"], [2027, "mangjong", "2027-06-06"],
  [2027, "dano", "2027-06-09"], [2027, "haji", "2027-06-21"], [2027, "soseo", "2027-07-07"],
  [2027, "yudu", "2027-07-18"], [2027, "chobok", "2027-07-20"], [2027, "daeseo", "2027-07-23"],
  [2027, "jungbok", "2027-07-30"], [2027, "chilseok", "2027-08-08"], [2027, "malbok", "2027-08-09"],
  [2027, "baekjung", "2027-08-16"], [2027, "chuseok", "2027-09-15"], [2027, "hallo", "2027-10-08"],
  [2027, "jungyang", "2027-10-08"], [2027, "sanggang", "2027-10-24"], [2027, "napil", "2027-01-16"],
  [2027, "malnal-spring", "2027-03-04"],
];
let failed = 0;
for (const [year, key, expected] of check) {
  const got = years[year]?.[key];
  if (got !== expected) {
    failed += 1;
    console.error(`calendar mismatch ${key} ${year}: got ${got}, report says ${expected}`);
  }
}
if (failed > 0) process.exit(1);

writeFileSync("src/data/calendar.json", `${JSON.stringify({ firstYear: FIRST_YEAR, lastYear: LAST_YEAR, years, lunarMonths: months })}\n`);
console.log(`calendar ${FIRST_YEAR}-${LAST_YEAR}: ${check.length} dates match the report`);
