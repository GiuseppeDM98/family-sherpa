import type { ASSET_TYPES, DEADLINE_CATEGORIES, DEADLINE_STATUSES, RECURRENCES } from "@/db/enums";

/**
 * Shared shapes for the deadline row/form/mark-paid trio
 * (docs/specs/06 §3), reused by both `/deadlines` and the asset detail
 * timeline. Kept apart from the components themselves so the three files can
 * reference each other's props without a circular import.
 */

export type DeadlineRowData = {
  id: string;
  category: (typeof DEADLINE_CATEGORIES)[number];
  title: string;
  due_date: string;
  amount_cents: number | null;
  recurrence: (typeof RECURRENCES)[number];
  status: (typeof DEADLINE_STATUSES)[number];
  asset_id: string | null;
};

export type DeadlineFormAsset = { id: string; name: string; type: (typeof ASSET_TYPES)[number] };

export type VehicleDeadlineContext = {
  matriculationDate: string | null;
  hasExistingRevisione: boolean;
};
