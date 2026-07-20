/**
 * Clock-time helpers for reminders.
 *
 * `src/lib/date.ts` handles date-only math (no DST, a `YYYY-MM-DD` is just a
 * calendar label). This module adds the piece that *does* have to reason about
 * DST: turning a Rome wall-clock `HH:MM` on a given day into the exact UTC
 * instant it represents. Persisted `therapy_intakes.scheduled_at` values are
 * this UTC instant, so an 08:00 dose fires at the right wall-clock time in both
 * CET (winter, +01:00) and CEST (summer, +02:00).
 *
 * We stay off any heavy date library and use `Intl.DateTimeFormat` with
 * `timeZone: 'Europe/Rome'`, which knows the IANA DST rules.
 */

import { APP_TIME_ZONE, todayInRome } from "@/lib/date";

// Re-exported so the three-function surface (`todayInRome`,
// `romeTimeToUtcIso`, `daysBetween`) all resolve from this module, even though
// the Rome-date math itself lives in date.ts (client-safe, no DST concern).
export { todayInRome };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The offset of `timeZone` from UTC at a given instant, in milliseconds
 * (positive east of UTC). Computed by formatting the instant into the target
 * zone's wall-clock fields and reading them back as if they were UTC — the gap
 * between that and the real instant is exactly the offset.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  // Some engines render midnight as hour "24"; normalize it to 0.
  const wallClockAsUtc = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour") % 24,
    field("minute"),
    field("second"),
  );

  return wallClockAsUtc - instant.getTime();
}

/**
 * The UTC instant (ISO 8601) of `hhmm` wall-clock time on `date` in Europe/Rome.
 *
 * @param date `YYYY-MM-DD`
 * @param hhmm `HH:MM` (24h)
 *
 * Example: `("2026-07-01", "08:00")` → `2026-07-01T06:00:00.000Z` (CEST),
 * `("2026-01-01", "08:00")` → `2026-01-01T07:00:00.000Z` (CET).
 */
export function romeTimeToUtcIso(date: string, hhmm: string): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const [hour, minute] = hhmm.split(":").map(Number) as [number, number];

  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  // First estimate the offset by probing the instant we'd get if the wall time
  // were UTC, then correct. A second probe at the corrected instant catches the
  // spring-forward/fall-back hour where the two offsets disagree.
  const offset = timeZoneOffsetMs(new Date(wallClockAsUtc), APP_TIME_ZONE);
  let utcMs = wallClockAsUtc - offset;
  const refinedOffset = timeZoneOffsetMs(new Date(utcMs), APP_TIME_ZONE);
  if (refinedOffset !== offset) utcMs = wallClockAsUtc - refinedOffset;

  return new Date(utcMs).toISOString();
}

/**
 * Whole calendar days from `fromYmd` to `toYmd` (positive if `toYmd` is later).
 * Both are treated as midnight-UTC calendar labels, so the result is never
 * skewed by a DST boundary that falls between them.
 */
export function daysBetween(fromYmd: string, toYmd: string): number {
  const from = new Date(`${fromYmd}T00:00:00.000Z`).getTime();
  const to = new Date(`${toYmd}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}
