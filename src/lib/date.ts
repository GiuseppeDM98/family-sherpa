/**
 * Date-only (`YYYY-MM-DD`) helpers.
 *
 * All user-facing scheduling in FamilySherpa is anchored to Europe/Rome,
 * never the server's local time — on Vercel the server runs in UTC, so
 * "today" is wrong for two hours every evening if computed
 * naively. Date *math* here is done in UTC on purpose: a `YYYY-MM-DD` is a
 * calendar label with no time attached, so shifting it by whole days can't hit
 * a DST boundary. Only the Rome-anchored `todayInRome` needs the timezone.
 *
 * (`src/lib/reminders/time.ts` adds the clock-time side of this — mapping
 * `HH:MM` in Rome to a UTC instant — which does have to reason about DST.)
 */

export const APP_TIME_ZONE = "Europe/Rome";

/** Today's calendar date in Europe/Rome, as `YYYY-MM-DD`. */
export function todayInRome(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDaysToYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Adds `months` to a `YYYY-MM-DD` date, clamping to the target month's last
 * day instead of rolling over (31 gen + 1 mese -> 28/29 feb, never 3 mar).
 * Lives here (not src/lib/reminders/recurrence.ts, its main caller) so that
 * deadline-smart-defaults.ts — imported from client form components — can
 * use it without pulling in recurrence.ts's `db` import, which drags
 * node:crypto into the browser bundle (AGENTS.md "Don't import
 * src/db/schema.ts from a client component").
 */
export function addMonthsToYmd(ymd: string, months: number): string {
  const [year, month, day] = ymd.split("-").map(Number) as [number, number, number];

  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = totalMonths % 12; // 0-based (0 = January)

  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  const mm = String(targetMonthIndex + 1).padStart(2, "0");
  const dd = String(targetDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * The next occurrence of `weekday` strictly after `fromYmd` (0 = Sunday …
 * 6 = Saturday) — Italian "giovedì prossimo" said on a Thursday means the
 * Thursday a week out, not today.
 */
export function nextWeekdayAfter(fromYmd: string, weekday: number): string {
  const current = new Date(`${fromYmd}T00:00:00.000Z`).getUTCDay();
  const daysAhead = ((weekday - current + 7) % 7) || 7;
  return addDaysToYmd(fromYmd, daysAhead);
}
