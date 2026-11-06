/** Finds a freely licensed lead photo for each food on Korean Wikipedia. Run by hand: node scripts/fetch-photos.ts <rawDir> */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rawDir = process.argv[2] ?? "/tmp/commons-raw";
const UA = { "User-Agent": "imamttae-seasonal-food-site/1.0 (static site build script)" };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FoodLite { id: string; ko: string; aka: string[]; en: string; tier: string; }

const foods: FoodLite[] = readdirSync("src/data/foods")
  .flatMap((file) => JSON.parse(readFileSync(join("src/data/foods", file), "utf8")) as FoodLite[])
  .filter((food) => food.tier !== "local");

const OK_LICENSE = /^(cc0|cc[- ]by(-sa)?[- ]?\d|public domain|pd)/i;

const PACE_MS = 1300;

async function polite(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await sleep(PACE_MS);
    const response = await fetch(url, { headers: UA });
    if (response.status !== 429 && response.status < 500) return response;
    const wait = Number(response.headers.get("retry-after") ?? 0);
    await sleep(Math.max(wait * 1000, 8000 * (attempt + 1)));
  }
  throw new Error(`gave up on ${url}`);
}

async function json(url: string): Promise<any> {
  const response = await polite(url);
  if (!response.ok) throw new Error(`failed ${url}`);
  return response.json();
}

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const chunks = <T,>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

/** Lead image file for each page title, following redirects. */
async function pageImages(titles: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const batch of chunks(titles, 45)) {
    const url = `https://ko.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&pilimit=50&titles=${encodeURIComponent(batch.join("|"))}`;
    const data = await json(url);
    const back = new Map<string, string>();
    for (const entry of data.query?.normalized ?? []) back.set(entry.to, entry.from);
    for (const entry of data.query?.redirects ?? []) back.set(entry.to, back.get(entry.from) ?? entry.from);
    for (const page of Object.values(data.query?.pages ?? {}) as { title: string; pageimage?: string }[]) {
      if (page.pageimage) out.set(back.get(page.title) ?? page.title, page.pageimage);
    }
  }
  return out;
}

async function fileInfos(names: readonly string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  for (const batch of chunks(names, 45)) {
    const titles = batch.map((name) => `File:${name}`).join("|");
    const url = `https://ko.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=960&titles=${encodeURIComponent(titles)}`;
    const data = await json(url);
    const back = new Map<string, string>();
    for (const entry of data.query?.normalized ?? []) back.set(entry.to, entry.from);
    for (const page of Object.values(data.query?.pages ?? {}) as { title: string; imageinfo?: any[] }[]) {
      const info = page.imageinfo?.[0];
      if (info) out.set((back.get(page.title) ?? page.title).replace(/^(File|파일):/, "").replaceAll(" ", "_"), info);
    }
  }
  return out;
}

const foundPath = join(rawDir, "found.json");
const found: Record<string, unknown> = existsSync(foundPath) ? JSON.parse(readFileSync(foundPath, "utf8")) : {};
const todo = foods.filter((food) => !found[food.id]);

const titles = [...new Set(todo.flatMap((food) => [food.ko, ...food.aka.slice(0, 2)]))];
const images = await pageImages(titles);
console.log(`${images.size} of ${titles.length} titles have a lead image`);
const names = [...new Set(images.values())].filter((name) => !/\.(svg|gif)$/i.test(name));
const infos = await fileInfos(names);
console.log(`${infos.size} of ${names.length} files have info`);

for (const food of todo) {
  for (const title of [food.ko, ...food.aka.slice(0, 2)]) {
    const image = images.get(title);
    const info = image ? infos.get(image.replaceAll(" ", "_")) : null;
    if (!image || !info) continue;
    const meta = info.extmetadata ?? {};
    const license: string = meta.LicenseShortName?.value ?? "";
    if (!OK_LICENSE.test(license) || !/^image\/(jpeg|png)/.test(info.mime)) continue;
    const response = await polite(info.thumburl).catch(() => null);
    if (!response?.ok) continue;
    writeFileSync(join(rawDir, `${food.id}.jpg`), Buffer.from(await response.arrayBuffer()));
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
    writeFileSync(foundPath, JSON.stringify(found, null, 2));
    console.log(food.id, title, license);
    break;
  }
}
console.log(`found ${Object.keys(found).length} of ${foods.length}`);
