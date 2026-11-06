/**
 * The foods most people in Korea would name without help, and the only ones on the wheel.
 * Everything else lives under "What else". Edit this list to change what the home page leads with.
 * The order matters: earlier foods win the "이맘때면 ___지" sentence.
 */
export const MAIN_LIST: readonly string[] = [
  "bangeo", "gul", "ttalgi", "gyul", "bungeoppang", "daege", "gimjang", "jeoneo", "kkotge", "daeha",
  "songi", "boksunga", "samgyetang", "mineo", "jukkumi", "dodari-ssukguk", "dangam", "gotgam", "tteokguk", "songpyeon",
  "patjuk", "baemjangeo", "gwamegi", "kkomak", "gim", "subak", "chamoe", "maesil", "minari", "chamdureup",
  "chal-oksusu", "goguma", "bomdong", "hongro", "singo", "hallabong", "hoppang", "patbingsu", "naengmyeon", "kongguksu",
  "daegu", "godeungeo", "galchi", "nakji", "meongge", "naengi", "ssuk", "haji-gamja", "haepssal", "bam",
  "syainmeoskaet", "muhwagwa",
];

const mainSet = new Set(MAIN_LIST);

export const isMain = (id: string): boolean => mainSet.has(id);
