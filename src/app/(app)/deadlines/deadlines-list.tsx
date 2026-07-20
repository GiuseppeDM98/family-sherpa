"use client";

import { useMemo, useState } from "react";
import { DeadlineRow } from "@/components/deadlines/deadline-row";
import type { DeadlineFormAsset, DeadlineRowData } from "@/components/deadlines/types";
import { Button } from "@/components/ui/button";
import type { ASSET_TYPES } from "@/db/enums";
import { formatMonthLongIt } from "@/lib/format";

export type DeadlineListRow = DeadlineRowData & {
  assetName: string | null;
  assetType: (typeof ASSET_TYPES)[number] | null;
};

type FilterGroup = "tutte" | "veicoli" | "casa" | "persone" | "altro";

const FILTERS: { key: FilterGroup; label: string }[] = [
  { key: "tutte", label: "Tutte" },
  { key: "veicoli", label: "Veicoli" },
  { key: "casa", label: "Casa" },
  { key: "persone", label: "Persone" },
  { key: "altro", label: "Altro" },
];

// A deadline's group follows its linked asset's type when it has one;
// otherwise it falls back to the category, mirroring the heuristic
// src/lib/inbound/materialize.ts uses to guess an asset type from a category.
const VEHICLE_CATEGORIES = new Set(["bollo", "revisione", "rca", "tagliando"]);
const HOME_CATEGORIES = new Set(["bolletta", "condominio", "tari"]);
const PERSON_CATEGORIES = new Set(["medico", "farmaco"]);

function groupOf(row: DeadlineListRow): FilterGroup {
  if (row.assetType === "vehicle") return "veicoli";
  if (row.assetType === "home") return "casa";
  if (row.assetType === "person") return "persone";
  if (VEHICLE_CATEGORIES.has(row.category)) return "veicoli";
  if (HOME_CATEGORIES.has(row.category)) return "casa";
  if (PERSON_CATEGORIES.has(row.category)) return "persone";
  return "altro";
}

/** Filter chips + month grouping for the global scadenze list. */
export function DeadlinesList({
  rows,
  assets,
  todayYmd,
}: {
  rows: DeadlineListRow[];
  assets: DeadlineFormAsset[];
  todayYmd: string;
}) {
  const [filter, setFilter] = useState<FilterGroup>("tutte");

  const filtered = useMemo(
    () => (filter === "tutte" ? rows : rows.filter((row) => groupOf(row) === filter)),
    [rows, filter],
  );

  const months = useMemo(() => {
    const byMonth = new Map<string, DeadlineListRow[]>();
    for (const row of filtered) {
      const key = row.due_date.slice(0, 7); // YYYY-MM
      const bucket = byMonth.get(key);
      if (bucket) bucket.push(row);
      else byMonth.set(key, [row]);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <Button
            key={option.key}
            type="button"
            size="sm"
            variant={filter === option.key ? "default" : "outline"}
            onClick={() => setFilter(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {months.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna scadenza in questa categoria.</p>
      ) : (
        months.map(([monthKey, monthRows]) => (
          <section key={monthKey} className="space-y-2">
            <h2 className="text-sm font-medium">{formatMonthLongIt(monthKey)}</h2>
            <div className="space-y-2">
              {monthRows.map((row) => (
                <DeadlineRow
                  key={row.id}
                  deadline={row}
                  assetName={row.assetName}
                  todayYmd={todayYmd}
                  assets={assets}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
