import type { DEADLINE_CATEGORIES } from "@/db/enums";
import { addMonthsToYmd, type Recurrence } from "@/lib/reminders/recurrence";

/**
 * Italian smart defaults for vehicle deadlines (docs/specs/06 §2, asset
 * detail "Aggiungi scadenza"). These are suggestions the form pre-fills when
 * the user picks a category — never enforced, always editable.
 */

type Category = (typeof DEADLINE_CATEGORIES)[number];

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
