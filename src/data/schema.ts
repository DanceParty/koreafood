import { z } from "zod";
import { ANCHORS, LANES } from "./constants.ts";

export { ANCHORS, LANES };

export const laneSchema = z.enum(LANES);
export type Lane = z.infer<typeof laneSchema>;

export const anchorSchema = z.enum(ANCHORS);
export type Anchor = z.infer<typeof anchorSchema>;

const mmdd = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "must be MM-DD");
const hangul = z.string().regex(/[가-힣]/, "must contain Hangul");

/** sourced: cited press, government, encyclopedia or market source. list: only an official monthly list.
 *  weak: one wiki, blog or low-authority guide. est: researcher's estimate. */
export const markSchema = z.enum(["sourced", "list", "weak", "est"]);
export type Mark = z.infer<typeof markSchema>;

const windowBase = {
  /** peak: the prime window. season: the wider run around it, for example arrival or tail. */
  kind: z.enum(["peak", "season"]),
  mark: markSchema,
  /** Short reader-facing tag for this window, e.g. "Females with roe". */
  label: z.string().min(1).max(60).optional(),
};

export const windowSchema = z.union([
  z.strictObject({ ...windowBase, from: mmdd, to: mmdd }),
  z.strictObject({
    ...windowBase,
    anchor: anchorSchema,
    before: z.number().int().min(0).max(60),
    after: z.number().int().min(0).max(60),
  }),
]);
export type FoodWindow = z.infer<typeof windowSchema>;

export const closureSchema = z.strictObject({
  from: mmdd,
  to: mmdd,
  /** Scope or caveat, e.g. "Incheon waters". */
  note: z.string().min(1).max(120).optional(),
});

export const sourceSchema = z.strictObject({
  label: z.string().min(1).max(60),
  url: z.url(),
});

export const foodSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    ko: hangul,
    aka: z.array(z.string().min(1)),
    rr: z.string().regex(/^[a-z' -]+$/),
    en: z.string().min(1).max(80),
    /** Lower-case phrase that reads after "it's": "yellowtail", "oysters". Required for national and known tiers. */
    phrase: z.string().min(1).max(60).optional(),
    lane: laneSchema,
    /** national: a ★ item. known: widely known. local: regional, niche or fishmonger knowledge. */
    tier: z.enum(["national", "known", "local"]),
    windows: z.array(windowSchema),
    /** Season words from a source for items with no sourced month. Never put these on the calendar. */
    undated: z.array(z.enum(["spring", "summer", "autumn", "winter"])).optional(),
    /** True when sources say it has no real season (farmed, imported, all year). */
    noSeason: z.boolean().optional(),
    blurb: z.string().min(20).max(420),
    eat: z.array(z.string().min(1).max(90)).max(5),
    where: z.array(z.string().min(1).max(50)).max(6),
    closures: z.array(closureSchema),
    festivals: z.array(z.string().min(1).max(100)).max(4),
    caveat: z.string().min(1).max(280).optional(),
    related: z.array(z.string()).max(6),
    sources: z.array(sourceSchema).max(8),
  })
  .superRefine((food, ctx) => {
    if (food.tier !== "local" && !food.phrase) {
      ctx.addIssue({ code: "custom", path: ["phrase"], message: "phrase required for national and known tiers" });
    }
    if (food.windows.length === 0 && !food.undated && !food.noSeason) {
      ctx.addIssue({ code: "custom", path: ["windows"], message: "needs windows, undated, or noSeason" });
    }
    if (food.windows.length > 0 && food.undated) {
      ctx.addIssue({ code: "custom", path: ["undated"], message: "undated must not coexist with windows" });
    }
    const banned = /[—–“”‘’]/;
    for (const text of [food.blurb, food.caveat ?? "", ...food.eat, ...food.where, ...food.festivals]) {
      if (banned.test(text)) {
        ctx.addIssue({ code: "custom", path: ["blurb"], message: `no em/en dashes or curly quotes: ${text.slice(0, 50)}` });
      }
    }
  });
export type Food = z.infer<typeof foodSchema>;

/** A dated moment worth a countdown. Either a fixed MM-DD or a calendar anchor. */
export const eventSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    ko: hangul,
    en: z.string().min(1).max(90),
    /** law: legal open or close. term: solar term. holiday: lunar or calendar holiday. market: commercial day. festival: food festival. */
    kind: z.enum(["law", "term", "holiday", "market", "festival"]),
    date: mmdd.optional(),
    anchor: anchorSchema.optional(),
    /** Only for one-off dated events: the single year it applies to. */
    year: z.number().int().optional(),
    foods: z.array(z.string()),
    note: z.string().min(1).max(160).optional(),
  })
  .refine((event) => Boolean(event.date) !== Boolean(event.anchor), {
    message: "exactly one of date or anchor",
  });
export type CalendarEvent = z.infer<typeof eventSchema>;
