import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { eventSchema, foodSchema, type Food } from "../src/data/schema.ts";

const dir = "src/data/foods";
const onlyLane = process.argv[2];
let problems = 0;
const report = (message: string) => {
  problems += 1;
  console.error(message);
};

const foods: Food[] = [];
for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const lane = file.replace(".json", "");
  const raw: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
  if (!Array.isArray(raw)) {
    report(`${file}: must be a JSON array`);
    continue;
  }
  for (const [index, item] of raw.entries()) {
    const parsed = foodSchema.safeParse(item);
    if (!parsed.success) {
      const name = (item as { id?: string }).id ?? `#${index}`;
      for (const issue of parsed.error.issues) {
        report(`${file} ${name} ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }
    if (parsed.data.lane !== lane) report(`${file} ${parsed.data.id}: lane is ${parsed.data.lane}`);
    foods.push(parsed.data);
  }
}

const ids = new Map<string, string>();
for (const food of foods) {
  if (ids.has(food.id)) report(`duplicate id ${food.id}`);
  ids.set(food.id, food.lane);
}
if (!onlyLane) {
  for (const food of foods) {
    for (const ref of food.related) {
      if (!ids.has(ref)) report(`${food.id}: related id ${ref} does not exist`);
    }
  }
}

const eventsPath = "src/data/events.json";
if (existsSync(eventsPath)) {
  const raw: unknown = JSON.parse(readFileSync(eventsPath, "utf8"));
  if (!Array.isArray(raw)) report("events.json must be an array");
  else {
    for (const [index, item] of raw.entries()) {
      const parsed = eventSchema.safeParse(item);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) report(`events #${index} ${issue.path.join(".")}: ${issue.message}`);
      } else if (!onlyLane) {
        for (const ref of parsed.data.foods) {
          if (!ids.has(ref)) report(`event ${parsed.data.id}: food id ${ref} does not exist`);
        }
      }
    }
  }
}

console.log(`${foods.length} foods checked, ${problems} problems`);
if (problems > 0) process.exit(1);
