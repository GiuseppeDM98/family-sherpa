import { RepeatIcon } from "lucide-react";
import Link from "next/link";
import { CategoryBadge } from "@/components/deadlines/category-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DEADLINE_CATEGORIES, RECURRENCES } from "@/db/enums";
import { RECURRENCE_LABELS } from "@/lib/deadline-labels";
import { formatDateIt, formatDueDateRelativeIt, formatEuroCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const DUE_SOON_DAYS = 30;

export type UpcomingDeadline = {
  id: string;
  category: (typeof DEADLINE_CATEGORIES)[number];
  title: string;
  due_date: string;
  amount_cents: number | null;
  recurrence: (typeof RECURRENCES)[number];
  assetName: string | null;
};

function daysUntil(dueDate: string, todayYmd: string): number {
  const diffMs =
    new Date(`${dueDate}T00:00:00.000Z`).getTime() - new Date(`${todayYmd}T00:00:00.000Z`).getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Home's read-only glance at what's coming due. Deliberately actionless: the
 * dashboard leads with foresight, so each row is a calm tap-through to
 * `/deadlines`, where "segna pagata"/edit/delete actually live (via the shared
 * `DeadlineRow`). Rendered as one card with a divided list — flatter and quieter
 * than a stack of per-deadline cards each carrying its own buttons.
 */
export function UpcomingDeadlines({
  deadlines,
  todayYmd,
}: {
  deadlines: UpcomingDeadline[];
  todayYmd: string;
}) {
  return (
    <Card>
      <CardContent className="divide-border divide-y">
        {deadlines.map((deadline) => {
          const daysAway = daysUntil(deadline.due_date, todayYmd);
          const isOverdue = daysAway < 0;
          const isDueSoon = daysAway >= 0 && daysAway <= DUE_SOON_DAYS;

          return (
            <Link
              key={deadline.id}
              href="/deadlines"
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="min-w-0 space-y-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={deadline.category} />
                  {deadline.recurrence !== "none" ? (
                    <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
                      <RepeatIcon className="size-3" aria-hidden />
                      {RECURRENCE_LABELS[deadline.recurrence]}
                    </span>
                  ) : null}
                </span>
                <span className="block text-sm font-medium">{deadline.title}</span>
                <span
                  className={cn(
                    "block text-xs",
                    isOverdue ? "text-destructive" : isDueSoon ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {formatDateIt(deadline.due_date)} · {formatDueDateRelativeIt(deadline.due_date, todayYmd)}
                  {deadline.assetName ? ` · ${deadline.assetName}` : ""}
                </span>
              </span>
              {deadline.amount_cents !== null ? (
                <span className="shrink-0 text-sm font-medium">{formatEuroCents(deadline.amount_cents)}</span>
              ) : null}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
