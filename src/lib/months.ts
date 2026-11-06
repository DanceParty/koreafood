import { MONTHS } from "./dates.ts";

export interface MonthCopy {
  slug: string;
  name: string;
  title: string;
  intro: string;
}

const copy: readonly (readonly [string, string])[] = [
  ["Cold water, fat fish", "Everything worth eating is in the sea or under glass. Yellowtail, oysters and cod are at their fattest, and Jeju's hybrid citrus starts with hallabong and red hyang. Gangwon runs its ice-fishing festivals if the ice shows up. Inje's smelt festival was cancelled three winters running for lack of it."],
  ["New Year soup and peak strawberries", "Seollal brings rice-cake soup, and Daeboreum two weeks later brings five-grain rice and nuts you crack with your teeth. Strawberry volume peaks late in the month. Saline-soil tomatoes from Busan start now, and greenhouse minari from Cheongdo sends people on pork belly day trips."],
  ["The first green things", "Shepherd's purse, wild chive and mugwort come up, and the month belongs to flounder and mugwort soup. The date comes from the mugwort, which turns tough after early April. Webfoot octopus fill with eggs, and on March 3 the whole country eats pork belly because the pig farmers run a very good promotion."],
  ["The tightest windows of the year", "April is why this calendar exists. Aralia shoots, Jeju's bracken, Ulleungdo's greens and raw silchi at Janggohang all last weeks, not months, and nothing stands in for them later. Gijang lands its spring anchovies, female blue crabs start, and first-flush tea has to be picked before Gogu on April 20."],
  ["Last call for octopus", "Webfoot octopus season ends by law on May 11. Sea squirt comes in from the farms, river pufferfish run the Imjin, and Damyang's bamboo shoots turn fibrous fast. Korean melons from Seongju are everywhere. By the end of the month cherries and green plums arrive."],
  ["Plums, potatoes, the last crab", "Buy green plums between June 5 and 20 if you plan to make syrup. Silver pomfret should be eaten before the solstice, solstice potatoes come out of the ground just ahead of the monsoon, and blue crab boats stop on June 21. Shinbi peaches last about ten days and people treat buying them like concert tickets."],
  ["Eat hot to beat the heat", "Three Boknal days fall between mid July and mid August, and restaurants fill for ginseng chicken soup, brown croaker and eel. Peaches start their cultivar relay, waxy corn peaks, and mitre squid season hits its height. Cold noodles do the rest of the work."],
  ["Peaches and the crab reopening", "Brown croaker peaks early in the month. Figs, grapes and the first pears arrive, and green mandarins go on legal sale from August 1. The real date is August 21, when the blue crab closure lifts and retail price wars start the same day. Cafes launch their chestnut lattes in the worst of the heat."],
  ["The harvest arrives all at once", "Gizzard shad, prawns, male blue crabs and pine mushrooms overlap with Hongro apples, Niitaka pears, chestnuts and the first new rice. Chuseok lands in the middle of it with half-moon rice cakes and taro soup."],
  ["Pine mushrooms and persimmons", "Pine mushrooms have been peaking in mid October in recent years, later than they used to. Sweet persimmons come in and the first oysters leave Tongyeong late in the month. Convenience stores restart their steamed buns, and fish-bread carts follow the first cold snap. Central Korea starts its kimchi-making."],
  ["Kimchi, oysters and the yellowtail queue", "This is the kimchi month. Gimjang moves south through November while the government runs a cabbage price package. Oysters come into prime, yellowtail demand opens, and persimmons go up to dry. November 11 is Pepero Day, and the college exam means sticky rice cakes for every student you know."],
  ["Yellowtail, strawberries, red-bean porridge", "Yellowtail hits its peak and the long queues in Seoul go with it. The first flush of strawberries tastes the best they will all winter, and mandarins are at their best picking. Dongji brings red-bean porridge, and hotels start their strawberry buffets at prices that make the news."],
];

export const MONTH_COPY: readonly MonthCopy[] = MONTHS.map((name, index) => {
  const [title = "", intro = ""] = copy[index] ?? [];
  return { slug: name.toLowerCase(), name, title, intro };
});
