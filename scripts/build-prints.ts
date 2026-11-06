/**
 * Turns approved Commons photos into one-ink halftones the site can print in any colour.
 * Run by hand after fetch-photos: node scripts/build-prints.ts <rawDir> <approved.json>
 * approved.json maps food id to true, or to an object with focus: "top" | "center" | "bottom".
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [rawDir = "/tmp/commons-raw", approvedPath = "/tmp/commons-raw/approved.json"] = process.argv.slice(2);
const OUT = "public/prints";
const SIZE = 760;
const CELL = 5.4;
const ANGLE = Math.PI / 4;

interface Found {
  file: string;
  author: string;
  license: string;
  licenseUrl: string;
  page: string;
}

const found: Record<string, Found> = JSON.parse(readFileSync(join(rawDir, "found.json"), "utf8"));
const approved: Record<string, true> = JSON.parse(readFileSync(approvedPath, "utf8"));

async function halftone(input: string, output: string): Promise<{ width: number; height: number }> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: SIZE, height: SIZE, fit: "inside", withoutEnlargement: false })
    .grayscale()
    .normalize({ lower: 1, upper: 96 })
    .blur(0.9)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const alpha = Buffer.alloc(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = (x * cos + y * sin) / CELL;
      const v = (-x * sin + y * cos) / CELL;
      const du = u - Math.floor(u) - 0.5;
      const dv = v - Math.floor(v) - 0.5;
      const distance = Math.hypot(du, dv);
      const luminance = (data[y * width + x] ?? 255) / 255;
      const lifted = luminance ** 0.62;
      const darkness = Math.max(0, 1 - lifted - 0.04);
      const radius = Math.sqrt(darkness) * 0.8;
      const edge = (radius - distance) * CELL + 0.5;
      alpha[y * width + x] = Math.round(Math.max(0, Math.min(1, edge)) * 255);
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) rgba[index * 4 + 3] = alpha[index] ?? 0;
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: 40, alphaQuality: 62, effort: 6 })
    .toFile(output);
  return { width, height };
}

function credit(author: string): string {
  const clean = author
    .replaceAll("&amp;", "&")
    .replace(/, https?:\S+/g, "")
    .replace(/^This (image|photo) (was created|has been taken) by (user )?/i, "")
    .replace(/\s+(at Mushroom Observer|and released under).*$/i, "")
    .replace(/^미상/, "")
    .trim();
  if (!clean || /^unknown/i.test(clean)) return "a Wikimedia Commons contributor";
  return clean.length > 70 ? `${clean.slice(0, 67).trimEnd()}...` : clean;
}

mkdirSync(OUT, { recursive: true });
const credits: Record<string, unknown> = {};
for (const id of Object.keys(approved)) {
  const entry = found[id];
  if (!entry) throw new Error(`no photo for ${id}`);
  const size = await halftone(join(rawDir, `${id}.jpg`), join(OUT, `${id}.webp`));
  credits[id] = { ...size, author: credit(entry.author), license: entry.license, licenseUrl: entry.licenseUrl, page: entry.page };
}
writeFileSync("src/data/prints.json", `${JSON.stringify(credits, null, 2)}\n`);
console.log(`${Object.keys(credits).length} prints`);
