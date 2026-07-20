import type { Medication, Therapy } from "@/db/schema";

/** Client-safe shapes for `/meds` (type-only imports from schema.ts are erased at build time). */

export type CabinetMedication = Pick<
  Medication,
  "id" | "name" | "format" | "aic_code" | "expiry_date" | "quantity"
> & {
  notes: string | null;
};

export type PersonAsset = { id: string; name: string };

export type TherapyRow = Pick<
  Therapy,
  | "id"
  | "person_asset_id"
  | "medication_id"
  | "medication_name"
  | "dosage_text"
  | "times_per_day"
  | "times"
  | "start_date"
  | "end_date"
>;

export type RecentIntake = {
  id: string;
  therapyId: string;
  scheduledAt: string;
  status: "pending" | "taken" | "skipped";
  medicationName: string;
  dosageText: string;
  personName: string | null;
  /** Computed server-side against request time — client components must stay pure (no `Date.now()` in render). */
  isLate: boolean;
};

export type HistoryDay = { ymd: string; status: "✓" | "✗" | "–" };
