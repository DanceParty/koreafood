import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CalendarEvent, Food } from "../src/data/schema.ts";

const dir = "src/data/foods";
const foods: Food[] = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .flatMap((name) => JSON.parse(readFileSync(join(dir, name), "utf8")));

const client = foods.map(({ id, ko, rr, en, phrase, lane, tier, windows }) => ({
  id, ko, rr, en, ...(phrase ? { phrase } : {}), lane, tier, windows,
}));

const events: CalendarEvent[] = JSON.parse(readFileSync("src/data/events.json", "utf8"));

mkdirSync("src/data/generated", { recursive: true });
writeFileSync("src/data/generated/foods.client.json", `${JSON.stringify(client)}\n`);
writeFileSync("src/data/generated/events.client.json", `${JSON.stringify(events)}\n`);
console.log(`client data: ${client.length} foods, ${events.length} events`);
