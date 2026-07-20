"use client";

import { CheckIcon, PencilIcon, RepeatIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteDeadline } from "@/app/(app)/deadlines/actions";
import { CategoryBadge } from "@/components/deadlines/category-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RECURRENCE_LABELS } from "@/lib/deadline-labels";
import { formatDateIt, formatDueDateRelativeIt, formatEuroCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DeadlineFormDialog } from "./deadline-form-dialog";
import { MarkPaidDialog } from "./mark-paid-dialog";
import type { DeadlineFormAsset, DeadlineRowData, VehicleDeadlineContext } from "./types";

const DUE_SOON_DAYS = 30;

function daysUntil(dueDate: string, todayYmd: string): number {
  const diffMs =
    new Date(`${dueDate}T00:00:00.000Z`).getTime() - new Date(`${todayYmd}T00:00:00.000Z`).getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * A single deadline: category chip, title, due date, amount, recurrence,
 * and (while pending) the segna pagata/modifica/elimina actions. Shared by
 * `/deadlines` and the asset detail timeline.
 */
export function DeadlineRow({
  deadline,
  assetName,
  todayYmd,
  assets,
  fixedAssetId,
  vehicleContext,
}: {
  deadline: DeadlineRowData;
  assetName?: string | null;
  todayYmd: string;
  assets: DeadlineFormAsset[];
  fixedAssetId?: string;
  vehicleContext?: VehicleDeadlineContext;
}) {
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isPending = deadline.status === "pending";
  const daysAway = daysUntil(deadline.due_date, todayYmd);
  const isOverdue = isPending && daysAway < 0;
  const isDueSoon = isPending && daysAway >= 0 && daysAway <= DUE_SOON_DAYS;

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteDeadline(deadline.id);
      if (result.ok) {
        toast.success("Scadenza eliminata.");
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={deadline.category} />
                {deadline.recurrence !== "none" ? (
                  <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
                    <RepeatIcon className="size-3" aria-hidden />
                    {RECURRENCE_LABELS[deadline.recurrence]}
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-medium">{deadline.title}</p>
              <p
                className={cn(
                  "text-xs",
                  isOverdue
                    ? "text-destructive"
                    : isDueSoon
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {formatDateIt(deadline.due_date)} · {formatDueDateRelativeIt(deadline.due_date, todayYmd)}
                {assetName ? ` · ${assetName}` : ""}
              </p>
            </div>
            {deadline.amount_cents !== null ? (
              <p className="shrink-0 text-sm font-medium">{formatEuroCents(deadline.amount_cents)}</p>
            ) : null}
          </div>

          {isPending ? (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => setPayOpen(true)}>
                <CheckIcon />
                {deadline.amount_cents !== null ? "Segna pagata" : "Segna fatta"}
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
                aria-label="Modifica scadenza"
              >
                <PencilIcon />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                aria-label="Elimina scadenza"
              >
                <Trash2Icon />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {editOpen ? (
        <DeadlineFormDialog
          open
          onOpenChange={setEditOpen}
          mode="edit"
          deadline={deadline}
          assets={assets}
          fixedAssetId={fixedAssetId}
          vehicleContext={vehicleContext}
        />
      ) : null}
      <MarkPaidDialog open={payOpen} onOpenChange={setPayOpen} deadline={deadline} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminare la scadenza?"
        description={`«${deadline.title}» verrà eliminata definitivamente.`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  );
}
