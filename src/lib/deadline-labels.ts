import type { DEADLINE_CATEGORIES, RECURRENCES } from "@/db/enums";

/** Italian display labels for the deadline enums (client-safe, no DB import). */

export const CATEGORY_LABELS: Record<(typeof DEADLINE_CATEGORIES)[number], string> = {
  bollo: "Bollo",
  revisione: "Revisione",
  rca: "RCA",
  tagliando: "Tagliando",
  documento: "Documento",
  bolletta: "Bolletta",
  condominio: "Condominio",
  tari: "TARI",
  medico: "Medico",
  farmaco: "Farmaco",
  abbonamento: "Abbonamento",
  altro: "Altro",
};

export const RECURRENCE_LABELS: Record<(typeof RECURRENCES)[number], string> = {
  none: "Nessuna",
  monthly: "Mensile",
  bimonthly: "Bimestrale",
  quarterly: "Trimestrale",
  semiannual: "Semestrale",
  annual: "Annuale",
  biennial: "Biennale",
};

/**
 * Fixed category -> chart color mapping (dataviz skill: "assign categorical
 * hues in fixed order, never cycled"). Slots are the `--chart-1..8`
 * tokens (src/app/globals.css). Categories sharing a slot never co-occur in the
 * same chart in practice — each asset's TCO breakdown only ever shows the
 * categories relevant to its own type (vehicle: bollo/revisione/rca/tagliando;
 * home: bolletta/condominio/tari; person: medico/farmaco/documento).
 */
export const CATEGORY_CHART_COLORS: Record<(typeof DEADLINE_CATEGORIES)[number], string> = {
  bollo: "var(--chart-1)",
  bolletta: "var(--chart-2)",
  medico: "var(--chart-3)",
  documento: "var(--chart-4)",
  tagliando: "var(--chart-5)",
  revisione: "var(--chart-6)",
  rca: "var(--chart-7)",
  condominio: "var(--chart-8)",
  tari: "var(--chart-3)",
  farmaco: "var(--chart-4)",
  abbonamento: "var(--chart-5)",
  altro: "var(--chart-6)",
};
