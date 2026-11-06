import type { APIRoute } from "astro";
import { upcoming } from "../lib/client-data.ts";
import { addDays, toIso, todayInSeoul } from "../lib/dates.ts";
import { foodById } from "../lib/foods.ts";

const stamp = (iso: string) => iso.replaceAll("-", "");

const escapeText = (text: string) =>
  text.replaceAll("\\", "\\\\").replaceAll(";", "\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");

/** RFC 5545 lines stay under 75 octets by folding. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 73) {
      parts.push(current);
      current = "";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export const GET: APIRoute = () => {
  const from = todayInSeoul();
  const site = "koreafood.keevandance.com";
  const events = upcoming(from, 400).filter((entry) => entry.on - from <= 400);
  const now = `${stamp(toIso(from))}T000000Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site}//imamttae//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:이맘때 Korean seasonal food",
    "X-WR-TIMEZONE:Asia/Seoul",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    ...events.flatMap(({ event, on }) => {
      const foods = event.foods.flatMap((id) => {
        const food = foodById.get(id);
        return food ? [`${food.ko} ${food.en}`] : [];
      });
      const description = [event.note, foods.length > 0 ? `Foods: ${foods.join(", ")}` : undefined].filter(Boolean).join("\n");
      const first = event.foods.find((id) => foodById.has(id));
      return [
        "BEGIN:VEVENT",
        `UID:${event.id}-${toIso(on)}@${site}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${stamp(toIso(on))}`,
        `DTEND;VALUE=DATE:${stamp(toIso(addDays(on, 1)))}`,
        fold(`SUMMARY:${escapeText(`${event.ko} ${event.en}`)}`),
        ...(description ? [fold(`DESCRIPTION:${escapeText(description)}`)] : []),
        ...(first ? [`URL:https://${site}/food/${first}/`] : []),
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return new Response(`${lines.join("\r\n")}\r\n`, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
