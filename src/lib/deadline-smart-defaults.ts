import type { DEADLINE_CATEGORIES, RECURRENCES } from "@/db/enums";
import { addMonthsToYmd } from "@/lib/date";

/**
 * Italian smart defaults for vehicle deadlines (docs/specs/06 §2, asset
 * detail "Aggiungi scadenza"). These are suggestions the form pre-fills when
 * the user picks a category — never enforced, always editable.
 *
 * Imports only client-safe modules (no `@/db/schema`, no `db`): this file is
 * used directly from deadline-form-dialog.tsx, a "use client" component
 * (AGENTS.md "Don't import src/db/schema.ts from a client component").
 */

type Category = (typeof DEADLINE_CATEGORIES)[number];
type Recurrence = (typeof RECURRENCES)[number];

export type SmartDeadlineDefault = { recurrence: Recurrence; dueDate: string | null };

// First revisione is due 4 years after matriculation (00-overview.md §8);
// every one after that is biennial regardless of matriculation date.
const FIRST_REVISIONE_MONTHS = 48;

export function suggestVehicleDeadlineDefault(
  category: Category,
  opts: { matriculationDate: string | null; hasExistingRevisione: boolean },
): SmartDeadlineDefault | null {
  switch (category) {
    case "bollo":
      return { recurrence: "annual", dueDate: null };
    case "rca":
      return { recurrence: "annual", dueDate: null };
    case "tagliando":
      return { recurrence: "none", dueDate: null };
    case "revisione":
      return {
        recurrence: "biennial",
        dueDate:
          opts.matriculationDate && !opts.hasExistingRevisione
            ? addMonthsToYmd(opts.matriculationDate, FIRST_REVISIONE_MONTHS)
            : null,
      };
    default:
      return null;
  }
}
