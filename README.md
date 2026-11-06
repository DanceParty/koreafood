# 이맘때 imamttae

"Around this time of year." A public calendar of what to eat in Korea, with a dial you spin through the year. Live at [koreafood.keevandance.com](https://koreafood.keevandance.com).

## What's here

- 425 foods in `src/data/foods/*.json`, each with windows, marks for how firm the date is, closures and sources. `src/data/CONVENTIONS.md` is the editorial spec and `src/data/schema.ts` the shape.
- `src/data/events.json` holds dated moments for the countdown and the calendar feed.
- `scripts/build-calendar.ts` computes solar terms, lunar months, 복날 and other anchors for 2026-2036, and checks them against published dates.
- Astro builds a static page for every food and month. The home page is a Preact island.

## Commands

```sh
nvm use          # Node 24
pnpm install
pnpm dev         # http://localhost:4321
pnpm test
pnpm run data    # regenerate calendar, client data and font subsets, validate everything
pnpm build
```

Pushing to `main` deploys to GitHub Pages. A nightly run at 00:10 Seoul time rebuilds the static snapshot.

Fonts in `fonts-src` are under the SIL Open Font License. `pnpm run data` subsets them to the characters the site uses.
