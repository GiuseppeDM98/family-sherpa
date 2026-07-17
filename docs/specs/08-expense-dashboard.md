---
spec: 08
title: Expense dashboard — predictive cash flow and asset TCO
depends_on: [02, 06]
complexity: medium
---

# 08 — Dashboard spese: cash flow predittivo e TCO per asset

## Goal

Turn stored deadlines/transactions into foresight: the Home page becomes a dashboard showing upcoming money pressure ("A settembre 800 € tra TARI e assicurazione") and each asset's real yearly cost.

## Scope

- Home (`/`, the `(app)` index) becomes the dashboard.
- Aggregation queries in `src/lib/analytics.ts` (pure + testable where possible).
- Cash-flow forecast (next 12 months), peak-month callout, upcoming list.
- TCO section per asset (last 12 months) + `/assets/[id]` cost breakdown tab.
- Charts with **Recharts**.

**Non-scope:** budgets, CSV export, bank import.

## 1. Aggregations — `src/lib/analytics.ts`

```ts
export type MonthlyForecast = { month: string /* YYYY-MM */; totalCents: number; items: { title: string; category: Category; amountCents: number; dueDate: string; assetName: string | null }[] };
export async function getCashFlowForecast(familyId, months = 12): Promise<MonthlyForecast[]>
// pending deadlines with amount_cents, grouped by month of due_date, PLUS projected
// recurrences: for each pending recurring deadline, roll nextDueDate() forward
// (reuse src/lib/reminders/recurrence.ts) and include projected occurrences that
// fall inside the window, flagged `projected: true` on the item.

export async function getAssetTco(familyId, assetId, fromYmd, toYmd): Promise<{ totalCents: number; byCategory: { category: Category; totalCents: number }[]; transactions: Transaction[] }>
export async function getFamilySpendSummary(familyId): Promise<{ last12mCents: number; byAsset: { assetId; assetName; type; totalCents }[] }>
```
- Grouping/projection logic must be pure functions over fetched rows (unit-testable): `projectRecurrences(deadlines, windowStart, windowEnd)` and `groupByMonth(items)` exported separately with Vitest tests (recurring annual deadline appears once; monthly appears each month; none past its date doesn't duplicate the real row).

## 2. Dashboard UI — `(app)/page.tsx`

Top-to-bottom (mobile-first):
1. **Saluto** ("Ciao <nome> 👋") + today's date in Italian.
2. **Prossime scadenze** card: next 5 pending by due date (reuse the spec 06 row component), link "Vedi tutte" → `/deadlines`. If any therapy intake is pending today, a slim strip "💊 Oggi: <n> somministrazioni" → `/meds`.
3. **Cash flow — prossimi 12 mesi**: Recharts bar chart, one bar per month, € on Y. Peak month (max total) highlighted with a distinct fill. Below the chart, the **peak callout** in plain Italian: "⚠️ A <mese> hai <totale> € di spese previste tra <top 2–3 categorie/titoli>". Tapping a bar reveals that month's item list (bottom sheet or expanding section). Projected items get a subtle "(stimata)" suffix.
4. **Costo dei tuoi asset (ultimi 12 mesi)**: horizontal list/table of assets with `totalCents` (from `getFamilySpendSummary`), sorted desc; each links to the asset's cost tab.
5. Empty states: with no amounts anywhere, show a friendly onboarding card pointing at the bot/inbox instead of empty charts.

Chart implementation notes: currency-format ticks with `Intl.NumberFormat it-IT` (compact, e.g. "800 €"); month labels as short Italian ("gen", "feb"…); accessible fallback: the per-month item list is real DOM content, the chart is enhancement. **If a `dataviz` skill is available in the implementing environment, load it before writing chart code and follow its palette/typography guidance.**

## 3. Asset cost tab — `/assets/[id]`

Add tab/section "Costi": period selector (ultimi 12 mesi / anno corrente), total, Recharts donut or horizontal bars by category, transaction list (date, title, amount) with manual "Aggiungi spesa" (creates a transaction with `source='manual'`).

## Acceptance criteria

1. Unit tests for `projectRecurrences` and `groupByMonth` pass, covering annual/monthly/none and window edges.
2. With seed data, the dashboard shows a 12-month chart whose peak month matches manual computation of seeded deadlines, and the callout names it correctly in Italian.
3. Marking a deadline as paid (spec 06 flow) moves its amount from the forecast into the asset TCO on refresh.
4. Vehicle asset cost tab totals equal the sum of its seeded transactions; adding a manual expense updates it.
5. Empty family (fresh account) sees the onboarding card, no broken charts.
6. Dashboard renders correctly at 375 px width (chart scrolls or fits, no horizontal page scroll).

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **medium** — set via `/model` before pasting. (Prescriptive spec; the pure aggregation functions are unit-tested.)

```
Read docs/specs/00-overview.md first, then implement
docs/specs/08-expense-dashboard.md in this repository, following CLAUDE.md.

Reuse nextDueDate from src/lib/reminders/recurrence.ts and the deadline row
component from spec 06 — do not duplicate them. If a dataviz skill is available
in your environment, load it before writing chart code. Follow the "Definition
of done" in 00-overview.md §9. Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
which seeded numbers I should be able to verify on the dashboard, and a
short checklist for mobile-width rendering.
```
