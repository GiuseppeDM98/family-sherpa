"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addDaysToYmd, todayInRome } from "@/lib/date";
import { markIntakeSkipped, markIntakeTaken } from "./actions";
import { TherapyCard } from "./therapy-card";
import { TherapyFormDialog } from "./therapy-form-dialog";
import type { CabinetMedication, HistoryDay, PersonAsset, RecentIntake, TherapyRow } from "./types";

const HISTORY_WINDOW_DAYS = 7;

const TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
});

function dayAdherence(dayIntakes: RecentIntake[], isToday: boolean): HistoryDay["status"] {
  if (dayIntakes.length === 0) return "–";
  if (dayIntakes.every((intake) => intake.status === "taken")) return "✓";
  // Today isn't over yet — a still-pending dose isn't a miss until tomorrow.
  if (isToday && dayIntakes.every((intake) => intake.status !== "skipped")) return "–";
  return "✗";
}

/** Terapie tab (spec 09 §2): today's checklist, active therapy cards, "crea terapia". */
export function TherapyTab({
  therapies,
  personAssets,
  cabinetMedications,
  recentIntakes,
  todayYmd,
}: {
  therapies: TherapyRow[];
  personAssets: PersonAsset[];
  cabinetMedications: CabinetMedication[];
  recentIntakes: RecentIntake[];
  todayYmd: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const personNameByAssetId = new Map(personAssets.map((person) => [person.id, person.name]));

  const todayIntakes = recentIntakes.filter(
    (intake) => todayInRome(new Date(intake.scheduledAt)) === todayYmd,
  );

  const historyDays = Array.from({ length: HISTORY_WINDOW_DAYS }, (_, index) =>
    addDaysToYmd(todayYmd, -(HISTORY_WINDOW_DAYS - 1) + index),
  );

  function handleTaken(intakeId: string) {
    startTransition(async () => {
      const result = await markIntakeTaken(intakeId);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  function handleSkipped(intakeId: string) {
    startTransition(async () => {
      const result = await markIntakeSkipped(intakeId);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Oggi</h2>
        <TherapyFormDialog personAssets={personAssets} cabinetMedications={cabinetMedications} />
      </div>

      {todayIntakes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna somministrazione prevista oggi.</p>
      ) : (
        <div className="space-y-2">
          {todayIntakes.map((intake) => (
            <Card key={intake.id}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {TIME_FORMATTER.format(new Date(intake.scheduledAt))}
                      </span>
                      {intake.isLate ? <Badge variant="destructive">In ritardo</Badge> : null}
                      {intake.status === "taken" ? <Badge variant="secondary">Fatto</Badge> : null}
                      {intake.status === "skipped" ? <Badge variant="outline">Saltata</Badge> : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {intake.medicationName}
                      {intake.personName ? ` · ${intake.personName}` : ""}
                    </p>
                  </div>

                  {intake.status === "pending" ? (
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" onClick={() => handleTaken(intake.id)} disabled={isPending}>
                        Fatto
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSkipped(intake.id)}
                        disabled={isPending}
                      >
                        Salta
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Terapie attive</h2>
        {therapies.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessuna terapia attiva.</p>
        ) : (
          <div className="space-y-2">
            {therapies.map((therapy) => {
              const therapyIntakes = recentIntakes.filter((intake) => intake.therapyId === therapy.id);
              const history: HistoryDay[] = historyDays.map((ymd) => ({
                ymd,
                status: dayAdherence(
                  therapyIntakes.filter((intake) => todayInRome(new Date(intake.scheduledAt)) === ymd),
                  ymd === todayYmd,
                ),
              }));

              return (
                <TherapyCard
                  key={therapy.id}
                  therapy={therapy}
                  personName={
                    therapy.person_asset_id ? (personNameByAssetId.get(therapy.person_asset_id) ?? null) : null
                  }
                  historyDays={history}
                  todayYmd={todayYmd}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
