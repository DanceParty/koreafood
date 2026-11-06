/** Foods people actually say "이맘때면 ___지" about come first. Ingredients and second names come last. */
const HEADLINERS: readonly string[] = [
  "bangeo", "gul", "ttalgi", "gyul", "bungeoppang", "daege", "gimjang", "jeoneo", "kkotge", "daeha",
  "songi", "boksunga", "samgyetang", "mineo", "jukkumi", "dodari-ssukguk", "dangam", "gotgam", "tteokguk", "songpyeon",
];

export const headlineRank = (id: string): number => {
  const index = HEADLINERS.indexOf(id);
  return index === -1 ? HEADLINERS.length : index;
};
