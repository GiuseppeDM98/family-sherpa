/**
 * Italian codice fiscale (CF) decoding and validation.
 *
 * Only the standard (non-omocodia) 16-character format is handled: the four
 * "letter for digit" substitutions the Agenzia delle Entrate applies to
 * disambiguate two people who would otherwise share a CF are rare enough
 * (and undecodable without a lookup table) that we simply treat those codes
 * as unparseable rather than guess wrong.
 *
 * Honesty rule: the CF encodes birth date and sex only — it has no
 * document-expiry information. Never derive more than that here.
 */

const CF_REGEX = /^[A-Z]{6}\d{2}[ABCDEHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/;

// Position 9 (0-indexed 8): birth month letter, in month order (A=January).
const MONTH_LETTERS = "ABCDEHLMPRST";

/**
 * Official check-character conversion tables (Agenzia delle Entrate). Every
 * one of the first 15 characters contributes a value depending on whether
 * its 1-indexed position is odd or even; the remainder of the sum mod 26
 * indexes into A-Z for the 16th (check) character.
 */
const ODD_POSITION_VALUES: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

const EVEN_POSITION_VALUES: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
};

const CHECK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Decodes birth date and sex from a well-formed CF. Returns `null` if the
 * string doesn't match the standard format — this does **not** verify the
 * check character (see `isValidCodiceFiscale`), so it can prefill a form
 * field while the user is still typing.
 */
export function decodeCodiceFiscale(cf: string): { birthDate: string; sex: "M" | "F" } | null {
  const normalized = cf.trim().toUpperCase();
  if (!CF_REGEX.test(normalized)) return null;

  const yearDigits = normalized.slice(6, 8);
  const monthLetter = normalized[8];
  const dayDigits = Number(normalized.slice(9, 11));

  const monthIndex = MONTH_LETTERS.indexOf(monthLetter ?? "");
  if (monthIndex === -1) return null;

  const sex: "M" | "F" = dayDigits > 40 ? "F" : "M";
  const day = sex === "F" ? dayDigits - 40 : dayDigits;
  if (day < 1 || day > 31) return null;

  // Two-digit year with no century marker: the inference rule is
  // "greater than the current two-digit year -> 1900s", i.e. it assumes
  // nobody registering a CF today was born more than ~99 years from now.
  const currentTwoDigitYear = new Date().getFullYear() % 100;
  const yearNum = Number(yearDigits);
  const century = yearNum > currentTwoDigitYear ? 1900 : 2000;
  const year = century + yearNum;

  const month = String(monthIndex + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");

  return { birthDate: `${year}-${month}-${dayStr}`, sex };
}

/** Format + official check-character validation. */
export function isValidCodiceFiscale(cf: string): boolean {
  const normalized = cf.trim().toUpperCase();
  if (!CF_REGEX.test(normalized)) return false;

  let sum = 0;
  for (let position = 1; position <= 15; position++) {
    const char = normalized[position - 1] ?? "";
    const values = position % 2 === 1 ? ODD_POSITION_VALUES : EVEN_POSITION_VALUES;
    const value = values[char];
    if (value === undefined) return false;
    sum += value;
  }

  const expectedCheckChar = CHECK_LETTERS[sum % 26];
  return normalized[15] === expectedCheckChar;
}
