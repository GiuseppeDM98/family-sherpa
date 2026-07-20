/**
 * Default intake times for a therapy.
 *
 * "3 volte al giorno" from a doctor means roughly every 8 waking hours, not
 * every 8 hours around the clock — so the schedule is spread over an 08:00–22:00
 * day rather than 00:00–24:00. Up to 4 doses the times are the conventional
 * Italian ones (08/12/16/20, meal-adjacent); beyond that there is no convention
 * to follow, so they're spread evenly across the window. The user can always
 * correct them later.
 */

const CONVENTIONAL_TIMES: Record<number, readonly string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 22 * 60;

function toHhMm(minutesFromMidnight: number): string {
  const rounded = Math.round(minutesFromMidnight);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** `times_per_day` (1–6) → the `therapies.times` array, `HH:MM` in Europe/Rome. */
export function defaultTherapyTimes(timesPerDay: number): string[] {
  const conventional = CONVENTIONAL_TIMES[timesPerDay];
  if (conventional) return [...conventional];

  const step = (DAY_END_MINUTES - DAY_START_MINUTES) / (timesPerDay - 1);
  return Array.from({ length: timesPerDay }, (_, index) =>
    toHhMm(DAY_START_MINUTES + step * index),
  );
}
