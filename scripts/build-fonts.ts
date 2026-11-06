import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";

const OUT = "public/fonts";

/** Every Hangul syllable the display fonts can be asked to draw: names and labels, not body prose. */
function displayText(): string {
  const chars = new Set<string>();
  const add = (text: string) => {
    for (const char of text) if (/[가-힣]/.test(char)) chars.add(char);
  };
  const foodsDir = "src/data/foods";
  for (const file of readdirSync(foodsDir)) {
    const foods: { ko: string; aka: string[] }[] = JSON.parse(readFileSync(join(foodsDir, file), "utf8"));
    for (const food of foods) {
      add(food.ko);
      add(food.aka.join(""));
    }
  }
  const events: { ko: string }[] = JSON.parse(readFileSync("src/data/events.json", "utf8"));
  for (const event of events) add(event.ko);
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (!path.includes("data/foods") && !path.includes("generated")) walk(path);
      } else if (/\.(astro|tsx?)$/.test(name)) {
        add(readFileSync(path, "utf8"));
      }
    }
  };
  walk("src");
  add("이맘때면방어지굴이");
  return [...chars].join("");
}

const ascii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");
const text = `${displayText()}${ascii}·`;

mkdirSync(OUT, { recursive: true });
for (const [source, target] of [
  ["fonts-src/BlackHanSans-Regular.ttf", "black-han-sans.woff2"],
  ["fonts-src/DoHyeon-Regular.ttf", "do-hyeon.woff2"],
] as const) {
  const output = await subsetFont(readFileSync(source), text, { targetFormat: "woff2" });
  writeFileSync(join(OUT, target), output);
  console.log(`${target}: ${(output.length / 1024).toFixed(0)} KB for ${text.length} glyphs`);
}
copyFileSync("node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2", join(OUT, "anton.woff2"));
copyFileSync("node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2", join(OUT, "bricolage.woff2"));
