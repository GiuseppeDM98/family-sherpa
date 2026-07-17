/**
 * Italian display formatting for the two value types that appear everywhere in
 * the app: money (always integer cents) and date-only strings
 * (docs/specs/00-overview.md §6).
 */

const EURO_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

/** 8750 → "87,50 €" */
export function formatEuroCents(cents: number): string {
  return EURO_FORMATTER.format(cents / 100);
}

/** "2026-01-31" → "31/01/2026" */
export function formatDateIt(ymd: string): string {
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/**
 * An ISO timestamp as Italian relative time ("2 ore fa"). Only ever used for
 * things that already happened, so the result is always in the past.
 */
export function formatRelativeTimeIt(iso: string, now: Date = new Date()): string {
  const elapsedSeconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);

  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (elapsedSeconds >= unitSeconds) {
      return RELATIVE_FORMATTER.format(-Math.floor(elapsedSeconds / unitSeconds), unit);
    }
  }
  return "adesso";
}
