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
