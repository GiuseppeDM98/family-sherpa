import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { assets, transactions, type DEADLINE_CATEGORIES, type RECURRENCES, deadlines, type Transaction } from "@/db/schema";
import { addMonthsToYmd, todayInRome } from "@/lib/date";
import { nextDueDate } from "@/lib/reminders/recurrence";

/**
 * Cash-flow forecast and TCO aggregations. The grouping/projection math is
 * pure and unit-tested (`projectRecurrences`,
 * `groupByMonth`); the `get*` functions wrap it with the actual DB reads.
 */

type Category = (typeof DEADLINE_CATEGORIES)[number];
type Recurrence = (typeof RECURRENCES)[number];

export type ForecastItem = {
  title: string;
  category: Category;
  amountCents: number;
  dueDate: string;
  assetName: string | null;
  projected: boolean;
};

export type MonthlyForecast = {
  month: string; // YYYY-MM
  totalCents: number;
  items: ForecastItem[];
};

export type ForecastDeadlineInput = {
  title: string;
  category: Category;
  dueDate: string;
  amountCents: number | null;
  recurrence: Recurrence;
  assetName: string | null;
};

/**
 * Expands pending deadlines into every occurrence (real + rolled-forward
 * recurrences) that falls inside `[windowStart, windowEnd]`. Deadlines with
 * no amount don't contribute to a cash-flow total, so they're skipped.
 * Occurrences roll forward with `nextDueDate` (src/lib/reminders/
 * recurrence.ts) until they leave the window; `recurrence: 'none'` yields at
 * most the one real occurrence, never a duplicate.
 */
export function projectRecurrences(
  deadlineList: ForecastDeadlineInput[],
  windowStart: string,
  windowEnd: string,
): ForecastItem[] {
  const items: ForecastItem[] = [];

  for (const deadline of deadlineList) {
    if (deadline.amountCents === null) continue;

    let dueDate = deadline.dueDate;
    let projected = false;
    while (dueDate <= windowEnd) {
      if (dueDate >= windowStart) {
        items.push({
          title: deadline.title,
          category: deadline.category,
          amountCents: deadline.amountCents,
          dueDate,
          assetName: deadline.assetName,
          projected,
        });
      }
      if (deadline.recurrence === "none") break;
      const next = nextDueDate(dueDate, deadline.recurrence);
      if (!next) break;
      dueDate = next;
      projected = true;
    }
  }

  return items;
}

/** Groups forecast items by the `YYYY-MM` of their due date, summing amounts. */
export function groupByMonth(items: ForecastItem[]): MonthlyForecast[] {
  const byMonth = new Map<string, MonthlyForecast>();

  for (const item of items) {
    const month = item.dueDate.slice(0, 7);
    let bucket = byMonth.get(month);
    if (!bucket) {
      bucket = { month, totalCents: 0, items: [] };
      byMonth.set(month, bucket);
    }
    bucket.totalCents += item.amountCents;
    bucket.items.push(item);
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** The `YYYY-MM` keys for `months` consecutive calendar months starting with `todayYmd`'s month. */
function monthKeysFrom(todayYmd: string, months: number): string[] {
  const [year, month] = todayYmd.split("-").map(Number) as [number, number];
  return Array.from({ length: months }, (_, i) => {
    const total = year * 12 + (month - 1) + i;
    const targetYear = Math.floor(total / 12);
    const targetMonth = (total % 12) + 1;
    return `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  });
}

/** The last calendar day of a `YYYY-MM` key, as `YYYY-MM-DD`. */
function lastDayOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

/**
 * Next `months` calendar months of pending-deadline cash flow, including
 * projected recurrences. Every month in the window is present in the result
 * (zero-filled) so the chart always has a complete, contiguous X axis.
 */
export async function getCashFlowForecast(
  familyId: string,
  months = 12,
): Promise<MonthlyForecast[]> {
  const todayYmd = todayInRome();
  const monthKeys = monthKeysFrom(todayYmd, months);
  const windowEnd = lastDayOfMonth(monthKeys[monthKeys.length - 1] as string);

  const rows = await db
    .select({
      title: deadlines.title,
      category: deadlines.category,
      dueDate: deadlines.due_date,
      amountCents: deadlines.amount_cents,
      recurrence: deadlines.recurrence,
      assetName: assets.name,
    })
    .from(deadlines)
    .leftJoin(assets, eq(deadlines.asset_id, assets.id))
    .where(and(eq(deadlines.family_id, familyId), eq(deadlines.status, "pending")));

  const items = projectRecurrences(rows, todayYmd, windowEnd);
  const forecastByMonth = new Map(groupByMonth(items).map((entry) => [entry.month, entry]));

  return monthKeys.map((month) => forecastByMonth.get(month) ?? { month, totalCents: 0, items: [] });
}

export type AssetTco = {
  totalCents: number;
  byCategory: { category: Category; totalCents: number }[];
  transactions: Transaction[];
};

/** Total spend and per-category breakdown for one asset's transactions in `[fromYmd, toYmd]`. */
export async function getAssetTco(
  familyId: string,
  assetId: string,
  fromYmd: string,
  toYmd: string,
): Promise<AssetTco> {
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.family_id, familyId),
        eq(transactions.asset_id, assetId),
        gte(transactions.date, fromYmd),
        lte(transactions.date, toYmd),
      ),
    )
    .orderBy(desc(transactions.date));

  const totalCents = rows.reduce((sum, row) => sum + row.amount_cents, 0);

  const byCategoryMap = new Map<Category, number>();
  for (const row of rows) {
    byCategoryMap.set(row.category, (byCategoryMap.get(row.category) ?? 0) + row.amount_cents);
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([category, categoryTotalCents]) => ({ category, totalCents: categoryTotalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);

  return { totalCents, byCategory, transactions: rows };
}

export type FamilySpendSummary = {
  last12mCents: number;
  byAsset: { assetId: string; assetName: string; type: string; totalCents: number }[];
};

/** Last-12-months spend, total and broken down per asset, for the "Costo dei tuoi asset" section. */
export async function getFamilySpendSummary(familyId: string): Promise<FamilySpendSummary> {
  const todayYmd = todayInRome();
  const fromYmd = addMonthsToYmd(todayYmd, -12);

  const rows = await db
    .select({
      assetId: transactions.asset_id,
      assetName: assets.name,
      type: assets.type,
      amountCents: transactions.amount_cents,
    })
    .from(transactions)
    .leftJoin(assets, eq(transactions.asset_id, assets.id))
    .where(and(eq(transactions.family_id, familyId), gte(transactions.date, fromYmd)));

  let last12mCents = 0;
  const byAssetMap = new Map<string, { assetId: string; assetName: string; type: string; totalCents: number }>();

  for (const row of rows) {
    last12mCents += row.amountCents;
    if (!row.assetId) continue; // spend not linked to an asset doesn't appear in the per-asset breakdown
    const existing = byAssetMap.get(row.assetId) ?? {
      assetId: row.assetId,
      assetName: row.assetName ?? "—",
      type: row.type ?? "other",
      totalCents: 0,
    };
    existing.totalCents += row.amountCents;
    byAssetMap.set(row.assetId, existing);
  }

  const byAsset = [...byAssetMap.values()].sort((a, b) => b.totalCents - a.totalCents);
  return { last12mCents, byAsset };
}
