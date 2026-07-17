"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markDeadlineComplete } from "@/app/(app)/deadlines/actions";
import { EuroInput, Field } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { todayInRome } from "@/lib/date";
import { formatDateIt } from "@/lib/format";
import type { DeadlineRowData } from "./types";

/**
 * "Segna pagata/fatta" (spec 06 §3): a deadline with an amount goes through
 * the paid flow (importo effettivo + data pagamento -> a transaction), one
 * without goes through the done flow (no money involved, e.g. a visit).
 */
export function MarkPaidDialog({
  open,
  onOpenChange,
  deadline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deadline: DeadlineRowData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const paidFlow = deadline.amount_cents !== null;
  const [amountCents, setAmountCents] = useState<number | null>(deadline.amount_cents);
  const [date, setDate] = useState(() => todayInRome());

  function handleConfirm() {
    startTransition(async () => {
      const result = await markDeadlineComplete(deadline.id, {
        paid: paidFlow,
        actualAmountCents: amountCents ?? undefined,
        date,
      });

      if (result.ok) {
        onOpenChange(false);
        toast.success(
          result.nextDueDate
            ? `Fatto! Prossima scadenza creata per il ${formatDateIt(result.nextDueDate)}.`
            : "Fatto!",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{paidFlow ? "Segna come pagata" : "Segna come fatta"}</DialogTitle>
          <DialogDescription>«{deadline.title}»</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {paidFlow ? (
            <Field label="Importo effettivo (€)">
              <EuroInput value={amountCents} onChange={setAmountCents} />
            </Field>
          ) : null}
          <Field label="Data">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Salvo…" : "Conferma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
