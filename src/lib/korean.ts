/** Whether the final syllable of a Hangul word ends in a consonant. */
export function hasBatchim(word: string): boolean {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

/** "방어" becomes "방어지.", "굴" becomes "굴이지." */
export const itIs = (word: string): string => `${word}${hasBatchim(word) ? "이지" : "지"}.`;
