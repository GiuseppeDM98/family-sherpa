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
