import { describe, expect, it } from "vitest";
import { formatDateIt, formatEuroCents, formatRelativeTimeIt } from "./format";

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

describe("formatRelativeTimeIt", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");
  const ago = (seconds: number) =>
    formatRelativeTimeIt(new Date(now.getTime() - seconds * 1000).toISOString(), now);

  it("says 'adesso' for anything under a minute", () => {
    expect(ago(0)).toBe("adesso");
    expect(ago(59)).toBe("adesso");
  });

  it("counts minutes, hours and days", () => {
    expect(ago(60)).toBe("1 minuto fa");
    expect(ago(5 * 60)).toBe("5 minuti fa");
    expect(ago(2 * 60 * 60)).toBe("2 ore fa");
    expect(ago(24 * 60 * 60)).toBe("ieri");
    expect(ago(3 * 24 * 60 * 60)).toBe("3 giorni fa");
  });

  it("falls back to coarser units for older messages", () => {
    expect(ago(60 * 24 * 60 * 60)).toBe("2 mesi fa");
    expect(ago(400 * 24 * 60 * 60)).toBe("anno scorso");
  });

  it("never reports the future when a clock is slightly ahead", () => {
    expect(formatRelativeTimeIt(new Date(now.getTime() + 5_000).toISOString(), now)).toBe(
      "adesso",
    );
  });
});
