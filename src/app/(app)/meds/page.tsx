import { and, asc, eq, gte } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { assets, medications, therapies, therapyIntakes } from "@/db/schema";
import { decryptField } from "@/lib/crypto";
import { addDaysToYmd, todayInRome } from "@/lib/date";
import { medicationExpiryStatus } from "@/lib/meds-labels";
import { romeTimeToUtcIso } from "@/lib/reminders/time";
import { requireFamily } from "@/lib/session";
import { CabinetTab } from "./cabinet-tab";
import { TherapyTab } from "./therapy-tab";

// Expiring-first sort (spec 09 §1): expired, then expiring soon (nearest
// first), then ok, then no expiry at all.
const STATUS_SORT_ORDER = { expired: 0, expiring: 1, ok: 2, none: 3 } as const;

const HISTORY_WINDOW_DAYS = 7;
// A dose reminds from 20 minutes past its time (spec 07's cron window) — the
// UI's "in ritardo" badge uses a coarser, human-facing threshold on top of that.
const LATE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export default async function MedsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { familyId } = await requireFamily();
  const todayYmd = todayInRome();

  const medicationRows = await db
    .select({
      id: medications.id,
      name: medications.name,
      format: medications.format,
      aic_code: medications.aic_code,
      expiry_date: medications.expiry_date,
      quantity: medications.quantity,
      notes_enc: medications.notes_enc,
    })
    .from(medications)
    .where(and(eq(medications.family_id, familyId), eq(medications.archived, false)));

  const cabinetMedications = medicationRows
    .map(({ notes_enc, ...rest }) => ({
      ...rest,
      notes: notes_enc ? decryptField(notes_enc) : null,
    }))
    .sort((a, b) => {
      const statusA = STATUS_SORT_ORDER[medicationExpiryStatus(a.expiry_date, todayYmd)];
      const statusB = STATUS_SORT_ORDER[medicationExpiryStatus(b.expiry_date, todayYmd)];
      if (statusA !== statusB) return statusA - statusB;
      if (a.expiry_date && b.expiry_date) return a.expiry_date.localeCompare(b.expiry_date);
      return a.name.localeCompare(b.name);
    });

  const personAssets = await db
    .select({ id: assets.id, name: assets.name })
    .from(assets)
    .where(and(eq(assets.family_id, familyId), eq(assets.type, "person"), eq(assets.archived, false)));

  const activeTherapies = await db
    .select()
    .from(therapies)
    .where(and(eq(therapies.family_id, familyId), eq(therapies.active, true)))
    .orderBy(asc(therapies.created_at));

  const historyStartYmd = addDaysToYmd(todayYmd, -(HISTORY_WINDOW_DAYS - 1));
  const historyLowerBoundIso = romeTimeToUtcIso(historyStartYmd, "00:00");

  const recentIntakeRows = await db
    .select({
      id: therapyIntakes.id,
      therapyId: therapyIntakes.therapy_id,
      scheduledAt: therapyIntakes.scheduled_at,
      status: therapyIntakes.status,
      medicationName: therapies.medication_name,
      dosageText: therapies.dosage_text,
      personName: assets.name,
    })
    .from(therapyIntakes)
    .innerJoin(therapies, eq(therapyIntakes.therapy_id, therapies.id))
    .leftJoin(assets, eq(therapies.person_asset_id, assets.id))
    .where(and(eq(therapies.family_id, familyId), gte(therapyIntakes.scheduled_at, historyLowerBoundIso)))
    .orderBy(asc(therapyIntakes.scheduled_at));

  const recentIntakes = recentIntakeRows.map((intake) => ({
    ...intake,
    isLate:
      intake.status === "pending" &&
      new Date().getTime() - new Date(intake.scheduledAt).getTime() > LATE_THRESHOLD_MS,
  }));

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-semibold">Armadietto</h1>

      <Tabs defaultValue={tab === "terapie" ? "terapie" : "armadietto"}>
        <TabsList>
          <TabsTrigger value="armadietto">Armadietto</TabsTrigger>
          <TabsTrigger value="terapie">Terapie</TabsTrigger>
        </TabsList>

        <TabsContent value="armadietto" className="pt-3">
          <CabinetTab medications={cabinetMedications} todayYmd={todayYmd} />
        </TabsContent>

        <TabsContent value="terapie" className="pt-3">
          <TherapyTab
            therapies={activeTherapies}
            personAssets={personAssets}
            cabinetMedications={cabinetMedications}
            recentIntakes={recentIntakes}
            todayYmd={todayYmd}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
