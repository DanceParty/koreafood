# Food data conventions

`src/data/foods/<lane>.json` is a JSON array of foods. `src/data/schema.ts` defines the shape. Run `node scripts/validate-data.ts <lane>` to check one lane (cross-lane `related` ids are checked only without the argument).

## Example

```json
{
  "id": "kkotge",
  "ko": "꽃게",
  "aka": ["암꽃게", "수꽃게"],
  "rr": "kkotge",
  "en": "Blue crab",
  "phrase": "blue crab",
  "lane": "sea",
  "tier": "national",
  "windows": [
    { "from": "04-01", "to": "06-20", "kind": "peak", "mark": "sourced", "label": "Females with roe" },
    { "from": "09-01", "to": "11-30", "kind": "peak", "mark": "sourced", "label": "Meaty males" },
    { "from": "08-21", "to": "08-31", "kind": "season", "mark": "sourced", "label": "Closure lifts" }
  ],
  "blurb": "West Sea crab with two seasons a year. Females carry roe in spring, males fill out in autumn. Boats stay in port through the summer closure, and retail price wars start the day it lifts.",
  "eat": ["간장게장, raw crab in soy sauce", "꽃게탕, spicy stew"],
  "where": ["Yeonpyeong (연평)", "Noryangjin market (노량진)"],
  "closures": [{ "from": "06-21", "to": "08-20", "note": "Local variants at Yeonpyeong and Baengnyeong" }],
  "festivals": [],
  "caveat": "Autumn 2026 was scarce, with males at 20,400 won/kg at Noryangjin.",
  "related": ["daeha"],
  "sources": [{ "label": "Incheon City", "url": "https://www.incheon.go.kr/ocean/OC020701" }]
}
```

## Rules

**Ids.** Kebab-case Revised Romanization of `ko`, unique site-wide. Two words become `a-b`, for example `chamdom`, `doenjang`, `gul-gukbap`.

**One entry per food.** Split a table row when it names distinct foods a person would order or buy separately ("오이, 상추" is two entries). Keep one entry for synonyms and grades (put them in `aka`). A row of minor market picks may stay as a few short entries. If the same food appears in two lanes, keep it in the lane where a person would look first and use `related`. Do not create duplicates across lanes: see the id prefixes each lane owns below.

**Romanization.** Revised Romanization of how the word is spelled with standard sound-change handling, lower case: 방어 bangeo, 굴 gul, 귤 gyul, 딸기 ttalgi, 꽃게 kkotge, 붕어빵 bungeoppang, 도다리쑥국 dodari-ssukguk, 전어 jeoneo.

**Windows.** Convert the report's Prime column into MM-DD. Month name alone covers the whole month. `early` is 01-10, `mid` 11-20, `late` 21-end. "Nov-Feb" is `11-01` to `02-28`; a window may wrap the year end. Use `02-28` for end of February.
- `kind: "peak"` is the prime window. Use `kind: "season"` for the wider run named in the report or notes ("sold into", "starts", "tail", "demand from", "ships from"). Omit `season` windows if the sources don't describe one. At least one peak unless the only claim is a wide run. Peak windows should not all be stretched: keep them as narrow as the source says.
- Two distinct seasons make two peak windows with `label`.
- Solar-term or lunar foods use `anchor` with `before` and `after` days, never a fixed date: `{ "anchor": "chuseok", "before": 10, "after": 2, "kind": "peak", "mark": "sourced" }`. Keys are in `ANCHORS` in schema.ts. 복날 foods use `chobok`, `malbok`. 김장 is a fixed window, not an anchor.
- Copy the mark from the report: no mark is `sourced`, `[list]` is `list`, `[weak]` is `weak`, `[est]` is `est`. Never upgrade a mark. A window you create yourself from a season word or arithmetic is `est`.

**No month.** `[no month]` items get `"windows": []` and `"undated": ["winter"]` with the season word(s) a source gave, or `"undated": []` if none. Never invent a month. Foods the report calls "No season" get `"windows": []` and `"noSeason": true`, and say why in the blurb. Items in the report's last "memory only" table get `undated` with any sourced season word and never use the memory column.

**Tier.** `national` only for the report's ★ items (the table of sixteen and any row starred). `known` for the second tier the report names and anything a typical Korean adult would name without help. `local` for the rest. Don't inflate. `phrase` must read naturally after "it's": "yellowtail", "oysters", "fish-shaped bread", "the first new rice". Include it for `known` and `national`.

**Blurb.** One to three sentences, 20 to 420 characters, plain English for someone curious who may not know the food. Say what it is, then why this window, then the most surprising true thing from the report or notes. Facts only from the report and notes. Use Hangul sparingly with an English gloss.

Writing rules: no em dashes, en dashes, or curly quotes (the validator rejects them). Straight quotes only. Use hyphens only inside compound words or ranges like "Nov-Feb". Colons rarely. No "not just X but Y". No puffery: delicacy, beloved, iconic, renowned, must-try, vibrant, rich history, nestled, boasts, testament, showcase, prized, "a staple of". State the fact instead. Active voice. Short sentences. Name the source when a claim is one person's view ("Seafood expert Kim Ji-min says Feb often beats Dec"). Any price, count, or yield must carry its year. Dated festival text must carry its year. Do not write "this year", "now", "today", "currently": the site outlives this research.

**eat.** Up to five short ways to eat it, each "Hangul, English gloss" where a dish name exists. Only what the sources support. Empty array if unknown.

**where.** Up to six places, "Romanized (한글)". Empty if none.

**closures.** Legal closed seasons from the report and notes as MM-DD. Note that the statute version is 2024-06-04 belongs on the About page, not here.

**festivals.** Strings with name and timing, carrying a year when dated: "Moseulpo Bangeo Festival, Nov 19-22, 2026".

**caveat.** One or two sentences when sources disagree, a claim is thin, the fresh food is effectively gone, or a year-specific supply note matters. Omit the key otherwise. Omit `phrase` and `caveat` when not applicable rather than using null.

**related.** Up to six ids of foods in any lane, used for cross-links. Only ids that will exist. Check other lane files if present. Dishes link to their ingredient and back.

**sources.** Up to eight, copied exactly from the report's links (keep the URL intact, percent-encoding included). Keep the report's short labels. Prefer the ones supporting the window.
