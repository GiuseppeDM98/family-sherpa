/**
 * Notification copy (docs/specs/07-reminders-notifications.md §2).
 *
 * Kept as pure functions — no DB, no I/O — so the exact Italian wording and the
 * "which title for which day count" logic can be unit-tested. `notifyUser`
 * (send.ts) consumes the `{ title, body }` these return.
 */

import { formatEuroCents } from "@/lib/format";

export type ReminderContent = { title: string; body: string };

/** "2026-01-31" -> "31/01" — the short due-date form used in reminder bodies. */
function shortDayMonth(ymd: string): string {
  const [, month, day] = ymd.split("-");
  return `${day}/${month}`;
}

/**
 * Copy for a deadline reminder, chosen by how many days remain.
 *
 * @param daysLeft due_date − today, in Europe/Rome: 30 / 7 / 1 / 0 for the
 *   upcoming milestones, −1 for the day-after "scaduta ieri" nudge.
 */
export function deadlineReminderContent(params: {
  title: string;
  assetName: string | null;
  amountCents: number | null;
  dueDate: string;
  daysLeft: number;
}): ReminderContent {
  const { title, assetName, amountCents, dueDate, daysLeft } = params;

  let heading: string;
  if (daysLeft < 0) {
    heading = "⚠️ Scadenza superata";
  } else if (daysLeft === 0) {
    heading = "⏰ Scade oggi";
  } else if (daysLeft === 1) {
    heading = "⏰ Scadenza domani";
  } else {
    heading = `⏰ Scadenza tra ${daysLeft} giorni`;
  }

  // Body joins only the parts that exist: title, asset, amount, short date.
  const parts = [title];
  if (assetName) parts.push(assetName);
  if (amountCents !== null) parts.push(formatEuroCents(amountCents));
  parts.push(shortDayMonth(dueDate));

  return { title: heading, body: parts.join(" — ") };
}

/** Copy for a therapy-intake (dose-time) reminder. */
export function therapyReminderContent(params: {
  medicationName: string;
  personName: string | null;
  dosageText: string;
}): ReminderContent {
  const { medicationName, personName, dosageText } = params;
  const who = personName ? ` — ${personName}` : "";
  return {
    title: "💊 Ora della medicina",
    body: `${medicationName}${who} (${dosageText})`,
  };
}
