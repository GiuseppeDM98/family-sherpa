import type { MonthlyForecast } from "@/lib/analytics";
import { formatEuroCents, formatMonthLongIt } from "@/lib/format";

const TOP_ITEMS_IN_CALLOUT = 3;

/**
 * "⚠️ A settembre hai 800 € di spese previste tra TARI e assicurazione".
 * `null` when every month is empty (nothing to warn about).
 */
export function buildPeakCallout(forecast: MonthlyForecast[]): string | null {
  const peak = forecast.reduce<MonthlyForecast | null>(
    (best, month) => (month.totalCents > (best?.totalCents ?? 0) ? month : best),
    null,
  );
  if (!peak || peak.totalCents === 0) return null;

  const topTitles = [...peak.items]
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, TOP_ITEMS_IN_CALLOUT)
    .map((item) => item.title);

  return `⚠️ A ${formatMonthLongIt(peak.month).split(" ")[0]?.toLowerCase()} hai ${formatEuroCents(
    peak.totalCents,
  )} di spese previste tra ${topTitles.join(", ")}.`;
}

/** The month key with the highest total, or `null` if every month is zero. */
export function findPeakMonth(forecast: MonthlyForecast[]): string | null {
  const peak = forecast.reduce<MonthlyForecast | null>(
    (best, month) => (month.totalCents > (best?.totalCents ?? 0) ? month : best),
    null,
  );
  return peak && peak.totalCents > 0 ? peak.month : null;
}
