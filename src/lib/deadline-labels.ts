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
 * Fixed category -> color mapping (dataviz skill: "assign categorical hues in
 * fixed order, never cycled"). Each of the 12 categories owns a **distinct**
 * `--chart-N` slot (src/app/globals.css) — no two share a hue — so the mapping
 * is unambiguous both in per-asset TCO charts and in the global `/deadlines`
 * list, where the `CategoryBadge` tints every chip by this hue.
 *
 * WARNING: if you add a deadline category, add a matching `--chart-N` token in
 * globals.css (light + dark) and a distinct slot here — don't reuse an existing
 * one, or two categories will collide in the deadline list.
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
  tari: "var(--chart-9)",
  farmaco: "var(--chart-10)",
  abbonamento: "var(--chart-11)",
  altro: "var(--chart-12)",
};
