import { describe, expect, it } from "vitest";
import { decodeCodiceFiscale, isValidCodiceFiscale } from "./cf";

// Both check characters below are derived by hand from the official
// odd/even table, not guessed — see SESSION_NOTES.md for the worked sum.
const VALID_MALE_CF = "RSSMRA80A01H501U"; // Mario Rossi, 01/01/1980, Roma (H501)
const VALID_FEMALE_CF = "RSSMRA80A41H501Y"; // same person's data, day+40 -> female

describe("decodeCodiceFiscale", () => {
  it("decodes a male birth date", () => {
    expect(decodeCodiceFiscale(VALID_MALE_CF)).toEqual({ birthDate: "1980-01-01", sex: "M" });
  });

  it("decodes a female birth date (day offset by 40)", () => {
    expect(decodeCodiceFiscale(VALID_FEMALE_CF)).toEqual({ birthDate: "1980-01-01", sex: "F" });
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(decodeCodiceFiscale(`  ${VALID_MALE_CF.toLowerCase()}  `)).toEqual({
      birthDate: "1980-01-01",
      sex: "M",
    });
  });

  it("infers the 1900s century for a two-digit year greater than the current one", () => {
    // "80" > current two-digit year in any year before 2080.
    expect(decodeCodiceFiscale(VALID_MALE_CF)?.birthDate.startsWith("19")).toBe(true);
  });

  it("returns null for a malformed string", () => {
    expect(decodeCodiceFiscale("not-a-cf")).toBeNull();
    expect(decodeCodiceFiscale("RSSMRA80A01H501")).toBeNull(); // 15 chars, missing check char
  });

  it("returns null for an invalid month letter", () => {
    // 'U' is not one of ABCDEHLMPRST.
    expect(decodeCodiceFiscale("RSSMRA80U01H501U")).toBeNull();
  });

  it("does not check the check character", () => {
    // Wrong check char but otherwise well-formed: still decodes.
    expect(decodeCodiceFiscale("RSSMRA80A01H501A")).toEqual({
      birthDate: "1980-01-01",
      sex: "M",
    });
  });
});

describe("isValidCodiceFiscale", () => {
  it("accepts a correct check character (male)", () => {
    expect(isValidCodiceFiscale(VALID_MALE_CF)).toBe(true);
  });

  it("accepts a correct check character (female)", () => {
    expect(isValidCodiceFiscale(VALID_FEMALE_CF)).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isValidCodiceFiscale(`  ${VALID_MALE_CF.toLowerCase()}  `)).toBe(true);
  });

  it("rejects a wrong check character", () => {
    expect(isValidCodiceFiscale("RSSMRA80A01H501A")).toBe(false);
  });

  it("rejects a malformed string", () => {
    expect(isValidCodiceFiscale("not-a-cf")).toBe(false);
    expect(isValidCodiceFiscale("")).toBe(false);
    expect(isValidCodiceFiscale("RSSMRA80A01H501")).toBe(false);
  });
});
