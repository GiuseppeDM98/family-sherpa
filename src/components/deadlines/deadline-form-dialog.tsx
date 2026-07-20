"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createDeadline, getDeadlineNotes, updateDeadline } from "@/app/(app)/deadlines/actions";
import { EuroInput, Field, NativeSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DEADLINE_CATEGORIES, RECURRENCES } from "@/db/enums";
import { todayInRome } from "@/lib/date";
import { CATEGORY_LABELS, RECURRENCE_LABELS } from "@/lib/deadline-labels";
import { suggestVehicleDeadlineDefault } from "@/lib/deadline-smart-defaults";
import type { DeadlineFormAsset, DeadlineRowData, VehicleDeadlineContext } from "./types";

type Category = (typeof DEADLINE_CATEGORIES)[number];
type Recurrence = (typeof RECURRENCES)[number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required in edit mode. */
  deadline?: DeadlineRowData;
  /** All family assets, for the optional asset select. Ignored when `fixedAssetId` is set. */
  assets: DeadlineFormAsset[];
  /** Asset-detail context: pins the asset and hides the select. */
  fixedAssetId?: string;
  /** Drives the Italian vehicle smart defaults when the category changes. */
  vehicleContext?: VehicleDeadlineContext;
};

type FormState = {
  title: string;
  category: Category;
  assetId: string | null;
  dueDate: string;
  amountCents: number | null;
  recurrence: Recurrence;
  notes: string;
};

function buildInitialState(deadline: Props["deadline"], fixedAssetId?: string): FormState {
  if (deadline) {
    return {
      title: deadline.title,
      category: deadline.category,
      assetId: deadline.asset_id,
      dueDate: deadline.due_date,
      amountCents: deadline.amount_cents,
      recurrence: deadline.recurrence,
      notes: "",
    };
  }
  return {
    title: "",
    category: "altro",
    assetId: fixedAssetId ?? null,
    dueDate: todayInRome(),
    amountCents: null,
    recurrence: "none",
    notes: "",
  };
}

/**
 * Create/edit form shared between `/deadlines` and the asset detail
 * timeline. Smart defaults (bollo/rca annual, revisione biennial +
 * matriculation date, tagliando none) are only ever a suggestion
 * applied when the category changes — the user can always override them.
 */
export function DeadlineFormDialog({
  open,
  onOpenChange,
  mode,
  deadline,
  assets,
  fixedAssetId,
  vehicleContext,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Lazy initializer only, no reset effect: the caller mounts a fresh
  // instance of this dialog per open (see AddDeadlineButton / DeadlineRow),
  // so the fields never need to reset mid-lifetime.
  const [state, setState] = useState<FormState>(() => buildInitialState(deadline, fixedAssetId));

  useEffect(() => {
    if (mode !== "edit" || !deadline) return;
    startTransition(async () => {
      const result = await getDeadlineNotes(deadline.id);
      if (result.ok) setState((current) => ({ ...current, notes: result.notes }));
    });
    // Fetch once for the deadline this fresh instance was mounted for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCategoryChange(category: Category) {
    const suggestion = suggestVehicleDeadlineDefault(category, {
      matriculationDate: vehicleContext?.matriculationDate ?? null,
      hasExistingRevisione: vehicleContext?.hasExistingRevisione ?? false,
    });
    setState((current) => ({
      ...current,
      category,
      recurrence: suggestion ? suggestion.recurrence : current.recurrence,
      dueDate: suggestion?.dueDate ?? current.dueDate,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      title: state.title,
      category: state.category,
      assetId: state.assetId,
      dueDate: state.dueDate,
      amountCents: state.amountCents,
      recurrence: state.recurrence,
      notes: state.notes,
    };

    startTransition(async () => {
      const result =
        mode === "edit" && deadline
          ? await updateDeadline(deadline.id, input)
          : await createDeadline(input);

      if (result.ok) {
        toast.success(mode === "edit" ? "Scadenza aggiornata." : "Scadenza aggiunta.");
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
          <DialogTitle>{mode === "edit" ? "Modifica scadenza" : "Aggiungi scadenza"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Titolo">
            <Input
              value={state.title}
              onChange={(event) =>
                setState((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </Field>

          <Field label="Categoria">
            <NativeSelect
              value={state.category}
              onChange={(event) => handleCategoryChange(event.target.value as Category)}
            >
              {DEADLINE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {!fixedAssetId ? (
            <Field label="Asset">
              <NativeSelect
                value={state.assetId ?? ""}
                onChange={(event) =>
                  setState((current) => ({ ...current, assetId: event.target.value || null }))
                }
              >
                <option value="">— Nessuno —</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          <Field label="Data">
            <Input
              type="date"
              value={state.dueDate}
              onChange={(event) =>
                setState((current) => ({ ...current, dueDate: event.target.value }))
              }
              required
            />
          </Field>

          <Field label="Importo (€)" hint="Lascia vuoto se non previsto.">
            <EuroInput
              value={state.amountCents}
              onChange={(amountCents) => setState((current) => ({ ...current, amountCents }))}
            />
          </Field>

          <Field label="Ricorrenza">
            <NativeSelect
              value={state.recurrence}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  recurrence: event.target.value as Recurrence,
                }))
              }
            >
              {RECURRENCES.map((recurrence) => (
                <option key={recurrence} value={recurrence}>
                  {RECURRENCE_LABELS[recurrence]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Note">
            <Input
              value={state.notes}
              onChange={(event) =>
                setState((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvo…" : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
