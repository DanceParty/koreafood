/** Finds a freely licensed lead photo for each food on Korean Wikipedia. Run by hand: node scripts/fetch-photos.ts <rawDir> */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rawDir = process.argv[2] ?? "/tmp/commons-raw";
const UA = { "User-Agent": "imamttae-seasonal-food-site/1.0 (static site build script)" };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FoodLite { id: string; ko: string; aka: string[]; en: string; tier: string; }

const foods: FoodLite[] = readdirSync("src/data/foods")
  .flatMap((file) => JSON.parse(readFileSync(join("src/data/foods", file), "utf8")) as FoodLite[])
  .filter((food) => food.tier !== "local");

const OK_LICENSE = /^(cc0|cc[- ]by(-sa)?[- ]?\d|public domain|pd)/i;

async function json(url: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: UA });
    if (response.ok) return response.json();
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`failed ${url}`);
}

async function pageImage(title: string): Promise<string | null> {
  const url = `https://ko.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(title)}`;
  const data = await json(url);
  const pages = Object.values(data.query?.pages ?? {}) as { pageimage?: string }[];
  return pages[0]?.pageimage ?? null;
}

async function fileInfo(name: string) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1000&titles=${encodeURIComponent(`File:${name}`)}`;
  const data = await json(url);
  const pages = Object.values(data.query?.pages ?? {}) as { imageinfo?: any[] }[];
  return pages[0]?.imageinfo?.[0] ?? null;
}

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const found: Record<string, unknown> = {};
for (const food of foods) {
  const titles = [food.ko, ...food.aka.slice(0, 2)];
  for (const title of titles) {
    await sleep(120);
    const image = await pageImage(title).catch(() => null);
    if (!image || /\.(svg|gif)$/i.test(image)) continue;
    const info = await fileInfo(image).catch(() => null);
    if (!info) continue;
    const meta = info.extmetadata ?? {};
    const license: string = meta.LicenseShortName?.value ?? "";
    if (!OK_LICENSE.test(license) || !/^image\/(jpeg|png)/.test(info.mime)) continue;
    const thumb: string = info.thumburl;
    const response = await fetch(thumb, { headers: UA });
    if (!response.ok) continue;
    const buffer = Buffer.from(await response.arrayBuffer());
    const path = join(rawDir, `${food.id}.jpg`);
    writeFileSync(path, buffer);
    found[food.id] = {
      file: image,
      title,
      author: strip(meta.Artist?.value ?? "Unknown"),
      license,
      licenseUrl: meta.LicenseUrl?.value ?? "",
      page: info.descriptionurl,
      width: info.thumbwidth,
      height: info.thumbheight,
    };
    console.log(food.id, title, license);
    break;
  }
}
writeFileSync(join(rawDir, "found.json"), JSON.stringify(found, null, 2));
console.log(`found ${Object.keys(found).length} of ${foods.length}`);
