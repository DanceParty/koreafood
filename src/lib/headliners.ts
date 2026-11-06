import { MAIN_LIST } from "../data/main-list.ts";

/** Earlier foods in the main list win the "이맘때면 ___지" sentence. */
export const headlineRank = (id: string): number => {
  const index = MAIN_LIST.indexOf(id);
  return index === -1 ? MAIN_LIST.length : index;
};
