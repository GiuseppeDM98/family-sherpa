import { daysBetween } from "@/lib/reminders/time";

/**
 * Expiry badge tier for a medication.
 * Client-safe (no `@/db` import, unlike `src/lib/meds.ts` — AGENTS.md "Don't
 * import src/db/schema.ts from a client component") so cabinet cards can
 * compute it without dragging `node:crypto` into the browser bundle.
 */

export type ExpiryStatus = "expired" | "expiring" | "ok" | "none";

const EXPIRING_SOON_DAYS = 60;

export function medicationExpiryStatus(
  expiryDate: string | null,
  todayYmd: string,
): ExpiryStatus {
  if (!expiryDate) return "none";
  const daysLeft = daysBetween(todayYmd, expiryDate);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring";
  return "ok";
}

/** "Scaduto da 3 giorni" / "Scade oggi" / "Scade tra 45 giorni" / "Scade tra 1 giorno". */
export function expiryBadgeLabel(expiryDate: string, todayYmd: string): string {
  const daysLeft = daysBetween(todayYmd, expiryDate);
  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return `Scaduto da ${overdueDays} ${overdueDays === 1 ? "giorno" : "giorni"}`;
  }
  if (daysLeft === 0) return "Scade oggi";
  return `Scade tra ${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"}`;
}
