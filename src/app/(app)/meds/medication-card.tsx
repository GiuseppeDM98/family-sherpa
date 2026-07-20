"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { expiryBadgeLabel, medicationExpiryStatus } from "@/lib/meds-labels";
import { cn } from "@/lib/utils";
import { archiveMedication } from "./actions";
import { MedicationFormDialog } from "./medication-form-dialog";
import type { CabinetMedication } from "./types";

const STATUS_BADGE_CLASS: Record<string, string> = {
  expired: "border-destructive text-destructive",
  expiring: "border-amber-500 text-amber-600 dark:text-amber-500",
};

export function MedicationCard({
  medication,
  todayYmd,
}: {
  medication: CabinetMedication;
  todayYmd: string;
}) {
  const router = useRouter();
  const [isArchiving, startArchiveTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const status = medicationExpiryStatus(medication.expiry_date, todayYmd);
  const meta = [medication.format, medication.aic_code ? `AIC ${medication.aic_code}` : null]
    .filter(Boolean)
    .join(" · ");

  function handleArchive() {
    startArchiveTransition(async () => {
      const result = await archiveMedication(medication.id);
      if (result.ok) {
        toast.success("Farmaco archiviato.");
        setArchiveOpen(false);
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{medication.name}</p>
              {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
            </div>
            {medication.expiry_date ? (
              <Badge variant="outline" className={cn("shrink-0", STATUS_BADGE_CLASS[status])}>
                {expiryBadgeLabel(medication.expiry_date, todayYmd)}
              </Badge>
            ) : null}
          </div>

          <div className="flex gap-1.5">
            <Button size="icon-sm" variant="outline" onClick={() => setEditOpen(true)}>
              <PencilIcon />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
              <Trash2Icon />
            </Button>
          </div>
        </CardContent>
      </Card>

      {editOpen ? (
        <MedicationFormDialog open onOpenChange={setEditOpen} mode="edit" medication={medication} />
      ) : null}
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiviare il farmaco?"
        description={`«${medication.name}» verrà rimosso dall'armadietto.`}
        confirmLabel="Archivia"
        onConfirm={handleArchive}
        isPending={isArchiving}
      />
    </>
  );
}
