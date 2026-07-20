"use client";

import { PauseIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateIt } from "@/lib/format";
import { daysBetween } from "@/lib/reminders/time";
import { deleteTherapy, pauseTherapy } from "./actions";
import { EditTherapyTimesDialog } from "./edit-therapy-times-dialog";
import type { HistoryDay, TherapyRow } from "./types";

/** One active therapy: dosage, schedule chips, progress, 7-day adherence strip, actions (spec 09 §2). */
export function TherapyCard({
  therapy,
  personName,
  historyDays,
  todayYmd,
}: {
  therapy: TherapyRow;
  personName: string | null;
  historyDays: HistoryDay[];
  todayYmd: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editTimesOpen, setEditTimesOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dayNumber = daysBetween(therapy.start_date, todayYmd) + 1;
  const totalDays = therapy.end_date ? daysBetween(therapy.start_date, therapy.end_date) + 1 : null;

  function handlePause() {
    startTransition(async () => {
      const result = await pauseTherapy(therapy.id);
      if (result.ok) {
        toast.success("Terapia messa in pausa.");
        setPauseOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTherapy(therapy.id);
      if (result.ok) {
        toast.success("Terapia eliminata.");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {therapy.medication_name}
              {personName ? ` · ${personName}` : ""}
            </p>
            <p className="text-muted-foreground text-xs">{therapy.dosage_text}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {therapy.times.map((time) => (
                <Badge key={time} variant="secondary">
                  {time}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {totalDays !== null
                ? `Giorno ${Math.min(Math.max(dayNumber, 1), totalDays)} di ${totalDays}`
                : `Dal ${formatDateIt(therapy.start_date)}`}
              {therapy.end_date ? ` · fino al ${formatDateIt(therapy.end_date)}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-sm" title="Ultimi 7 giorni">
            {historyDays.map((day) => (
              <span key={day.ymd} title={day.ymd} aria-label={day.ymd}>
                {day.status}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            <Button size="icon-sm" variant="outline" onClick={() => setEditTimesOpen(true)}>
              <PencilIcon />
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => setPauseOpen(true)}>
              <PauseIcon />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon />
            </Button>
          </div>
        </CardContent>
      </Card>

      {editTimesOpen ? (
        <EditTherapyTimesDialog
          open
          onOpenChange={setEditTimesOpen}
          therapyId={therapy.id}
          initialTimes={therapy.times}
        />
      ) : null}
      <ConfirmDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title="Mettere in pausa la terapia?"
        description={`Non verranno più generate nuove somministrazioni per «${therapy.medication_name}».`}
        confirmLabel="Metti in pausa"
        onConfirm={handlePause}
        isPending={isPending}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminare la terapia?"
        description={`«${therapy.medication_name}» e tutte le sue somministrazioni verranno eliminate.`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  );
}
