"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyForecast } from "@/lib/analytics";
import { formatEuroCents, formatEuroCentsCompact, formatMonthLongIt, formatMonthShortIt } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChartDatum = { month: string; totalCents: number; isPeak: boolean };

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.[0]) return null;
  const datum = payload[0].payload as ChartDatum;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{formatMonthLongIt(datum.month)}</p>
      <p className="text-muted-foreground">{formatEuroCents(datum.totalCents)}</p>
    </div>
  );
}

/**
 * Cash-flow bar chart (docs/specs/08-expense-dashboard.md §2): one bar per
 * month, the peak month in a distinct fill. Tapping a bar (or its label,
 * since bars can be narrow on mobile) expands that month's item list below
 * the chart — real DOM content, so the data survives without the chart.
 */
export function CashFlowChart({
  forecast,
  peakMonth,
}: {
  forecast: MonthlyForecast[];
  peakMonth: string | null;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const data: ChartDatum[] = forecast.map((entry) => ({
    month: entry.month,
    totalCents: entry.totalCents,
    isPeak: entry.month === peakMonth,
  }));

  const selected = forecast.find((entry) => entry.month === selectedMonth) ?? null;

  return (
    <div className="space-y-3">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            onClick={(state) => {
              const label = state?.activeLabel;
              if (typeof label === "string") setSelectedMonth((current) => (current === label ? null : label));
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthShortIt}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatEuroCentsCompact}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={ChartTooltip} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="totalCents" radius={[4, 4, 0, 0]} maxBarSize={24} cursor="pointer">
              {data.map((entry) => (
                <Cell key={entry.month} fill={entry.isPeak ? "var(--chart-6)" : "var(--chart-1)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selected ? (
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{formatMonthLongIt(selected.month)}</p>
              <p className="text-sm font-medium">{formatEuroCents(selected.totalCents)}</p>
            </div>
            {selected.items.length === 0 ? (
              <p className="text-muted-foreground text-xs">Nessuna spesa prevista.</p>
            ) : (
              <ul className="divide-border divide-y">
                {selected.items.map((item, index) => (
                  <li
                    key={`${item.title}-${item.dueDate}-${index}`}
                    className="flex items-center justify-between gap-2 py-1.5 text-xs first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 truncate">
                      {item.title}
                      {item.assetName ? ` · ${item.assetName}` : ""}
                      {item.projected ? (
                        <span className="text-muted-foreground"> (stimata)</span>
                      ) : null}
                    </span>
                    <span className={cn("shrink-0 font-medium", item.projected && "text-muted-foreground")}>
                      {formatEuroCents(item.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <span className="bg-chart-1 inline-block size-2.5 rounded-full" aria-hidden />
          Mese
        </span>
        {peakMonth ? (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="bg-chart-6 inline-block size-2.5 rounded-full" aria-hidden />
            Mese di picco
          </span>
        ) : null}
        <span className="text-muted-foreground ml-auto">Tocca una colonna per i dettagli</span>
      </div>
    </div>
  );
}
