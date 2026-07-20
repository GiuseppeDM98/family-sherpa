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

const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat("it-IT", { month: "short" });

/** "2026-08" -> "ago" (dashboard cash-flow chart X-axis ticks, docs/specs/08 §2). */
export function formatMonthShortIt(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  return MONTH_SHORT_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
}

/** "2026-08" -> "Agosto 2026" (dashboard month-detail heading). */
export function formatMonthLongIt(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  const label = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** 875000 -> "8.750 €" (compact euro for chart ticks, no decimals). */
const COMPACT_EURO_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
export function formatEuroCentsCompact(cents: number): string {
  return COMPACT_EURO_FORMATTER.format(cents / 100);
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

/**
 * A due date's Italian relative label for scheduling UI: "oggi", "domani",
 * "tra 5 giorni", "scaduta da 3 giorni". Unlike `formatRelativeTimeIt`
 * (always past), a due date can be future, today, or overdue — overdue gets
 * its own wording since "3 giorni fa" doesn't read naturally for a deadline.
 */
export function formatDueDateRelativeIt(dueDate: string, todayYmd: string): string {
  const diffDays = Math.round(
    (new Date(`${dueDate}T00:00:00.000Z`).getTime() -
      new Date(`${todayYmd}T00:00:00.000Z`).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return `scaduta da ${overdueDays} ${overdueDays === 1 ? "giorno" : "giorni"}`;
  }
  return RELATIVE_FORMATTER.format(diffDays, "day");
}
