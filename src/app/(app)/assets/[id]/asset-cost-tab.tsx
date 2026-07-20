"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AssetTco } from "@/lib/analytics";
import { CATEGORY_CHART_COLORS, CATEGORY_LABELS } from "@/lib/deadline-labels";
import { formatDateIt, formatEuroCents, formatEuroCentsCompact } from "@/lib/format";

type Period = "12m" | "year";

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.[0]) return null;
  const datum = payload[0].payload as { category: keyof typeof CATEGORY_LABELS; totalCents: number };
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{CATEGORY_LABELS[datum.category]}</p>
      <p className="text-muted-foreground">{formatEuroCents(datum.totalCents)}</p>
    </div>
  );
}

/** "Costi" tab: period selector, total, breakdown by category, transaction list. */
export function AssetCostTab({
  assetId,
  tco12m,
  tcoYear,
}: {
  assetId: string;
  tco12m: AssetTco;
  tcoYear: AssetTco;
}) {
  const [period, setPeriod] = useState<Period>("12m");
  const tco = period === "12m" ? tco12m : tcoYear;

  const chartData = useMemo(
    () => tco.byCategory.map((entry) => ({ category: entry.category, totalCents: entry.totalCents })),
    [tco.byCategory],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={period === "12m" ? "default" : "outline"}
            onClick={() => setPeriod("12m")}
          >
            Ultimi 12 mesi
          </Button>
          <Button
            type="button"
            size="sm"
            variant={period === "year" ? "default" : "outline"}
            onClick={() => setPeriod("year")}
          >
            Anno corrente
          </Button>
        </div>
        <AddTransactionDialog assetId={assetId} />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-2xl font-semibold">{formatEuroCents(tco.totalCents)}</p>

          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nessuna spesa in questo periodo.</p>
          ) : (
            <div style={{ height: Math.max(chartData.length * 32, 60) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tickFormatter={(category: keyof typeof CATEGORY_LABELS) => CATEGORY_LABELS[category]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip content={ChartTooltip} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="totalCents" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {chartData.map((entry) => (
                      <Cell key={entry.category} fill={CATEGORY_CHART_COLORS[entry.category]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {tco.transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna spesa registrata in questo periodo.</p>
      ) : (
        <Card>
          <CardContent className="divide-border divide-y">
            {tco.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-medium">{transaction.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateIt(transaction.date)} · {CATEGORY_LABELS[transaction.category]}
                  </p>
                </div>
                <p className="shrink-0 font-medium">{formatEuroCentsCompact(transaction.amount_cents)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
