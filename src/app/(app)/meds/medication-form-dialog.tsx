"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createMedication, updateMedication } from "./actions";
import type { CabinetMedication } from "./types";

type FormState = {
  name: string;
  format: string;
  aicCode: string;
  expiryDate: string;
  quantity: string;
  notes: string;
};

function emptyState(): FormState {
  return { name: "", format: "", aicCode: "", expiryDate: "", quantity: "", notes: "" };
}

function stateFromMedication(medication: CabinetMedication): FormState {
  return {
    name: medication.name,
    format: medication.format ?? "",
    aicCode: medication.aic_code ?? "",
    expiryDate: medication.expiry_date ?? "",
    quantity: medication.quantity ?? "",
    notes: medication.notes ?? "",
  };
}

/** "Aggiungi a mano" / edit dialog for a cabinet medication (spec 09 §1). */
export function MedicationFormDialog({
  open,
  onOpenChange,
  mode,
  medication,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  medication?: CabinetMedication;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(() =>
    medication ? stateFromMedication(medication) : emptyState(),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      name: state.name,
      format: state.format || undefined,
      aicCode: state.aicCode || undefined,
      expiryDate: state.expiryDate || undefined,
      quantity: state.quantity || undefined,
      notes: state.notes || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createMedication(input)
          : await updateMedication(medication!.id, input);
      if (result.ok) {
        toast.success(mode === "create" ? "Farmaco aggiunto." : "Farmaco aggiornato.");
        onOpenChange(false);
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
          <DialogTitle>{mode === "create" ? "Aggiungi farmaco" : "Modifica farmaco"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Nome">
            <Input
              value={state.name}
              onChange={(event) => setState((s) => ({ ...s, name: event.target.value }))}
              required
            />
          </Field>

          <Field label="Formato" hint="Es. compresse, sciroppo, gocce">
            <Input
              value={state.format}
              onChange={(event) => setState((s) => ({ ...s, format: event.target.value }))}
            />
          </Field>

          <Field label="Codice AIC" hint="9 cifre, facoltativo">
            <Input
              value={state.aicCode}
              onChange={(event) => setState((s) => ({ ...s, aicCode: event.target.value }))}
              inputMode="numeric"
              maxLength={9}
            />
          </Field>

          <Field label="Scadenza">
            <Input
              type="date"
              value={state.expiryDate}
              onChange={(event) => setState((s) => ({ ...s, expiryDate: event.target.value }))}
            />
          </Field>

          <Field label="Quantità">
            <Input
              value={state.quantity}
              onChange={(event) => setState((s) => ({ ...s, quantity: event.target.value }))}
            />
          </Field>

          <Field label="Note">
            <Input
              value={state.notes}
              onChange={(event) => setState((s) => ({ ...s, notes: event.target.value }))}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Annulla
            </Button>
            <Button type="submit" disabled={isPending || !state.name.trim()}>
              {isPending ? "Salvo…" : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
