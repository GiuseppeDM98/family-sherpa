import { describe, expect, it } from "vitest";
import { formatDateIt, formatEuroCents } from "./format";

/** Intl separates the amount from "€" with U+00A0; compare against plain spaces. */
function normalized(cents: number): string {
  return formatEuroCents(cents).replace(/ /g, " ");
}

describe("formatEuroCents", () => {
  it("formats cents as Italian euro", () => {
    expect(normalized(8750)).toBe("87,50 €");
  });

  it("groups thousands with a dot", () => {
    // Italian uses "min2" grouping: four-digit amounts stay unseparated.
    expect(normalized(123456)).toBe("1234,56 €");
    expect(normalized(1234567)).toBe("12.345,67 €");
  });

  it("formats zero", () => {
    expect(normalized(0)).toBe("0,00 €");
  });
});

describe("formatDateIt", () => {
  it("renders a YYYY-MM-DD date as DD/MM/YYYY", () => {
    expect(formatDateIt("2026-01-31")).toBe("31/01/2026");
  });
});
