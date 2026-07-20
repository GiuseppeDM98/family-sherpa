"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAsset, updateAsset } from "@/app/(app)/assets/actions";
import { Field, NativeSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ASSET_TYPES,
  HOME_OWNERSHIPS,
  PERSON_RELATIONSHIPS,
  VEHICLE_FUELS,
} from "@/db/enums";
import { decodeCodiceFiscale, isValidCodiceFiscale } from "@/lib/cf";

type AssetType = (typeof ASSET_TYPES)[number];

const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

const TYPE_LABELS: Record<AssetType, string> = {
  vehicle: "Veicolo",
  person: "Persona",
  home: "Casa",
  other: "Altro",
};

const FUEL_LABELS: Record<(typeof VEHICLE_FUELS)[number], string> = {
  benzina: "Benzina",
  diesel: "Diesel",
  gpl: "GPL",
  metano: "Metano",
  elettrica: "Elettrica",
  ibrida: "Ibrida",
};

const RELATIONSHIP_LABELS: Record<(typeof PERSON_RELATIONSHIPS)[number], string> = {
  adulto: "Adulto",
  bambino: "Bambino",
  altro: "Altro",
};

const OWNERSHIP_LABELS: Record<(typeof HOME_OWNERSHIPS)[number], string> = {
  "proprietà": "Proprietà",
  affitto: "Affitto",
};

export type EditableAsset = {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
  codiceFiscale?: string | null;
  notes?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  type: AssetType;
  /** Required in edit mode; the decrypted CF/notes come from the server. */
  asset?: EditableAsset;
};

type FormState = {
  name: string;
  notes: string;
  plate: string;
  make: string;
  model: string;
  year: string;
  fuel: string;
  matriculationDate: string;
  codiceFiscale: string;
  birthDate: string;
  relationship: string;
  address: string;
  ownership: string;
};

const DEFAULT_NAMES: Record<AssetType, string> = {
  vehicle: "",
  person: "",
  home: "Casa",
  other: "",
};

function buildInitialState(type: AssetType, asset?: EditableAsset): FormState {
  const metadata = asset?.metadata ?? {};
  return {
    name: asset?.name ?? DEFAULT_NAMES[type],
    notes: asset?.notes ?? "",
    plate: typeof metadata.plate === "string" ? metadata.plate : "",
    make: typeof metadata.make === "string" ? metadata.make : "",
    model: typeof metadata.model === "string" ? metadata.model : "",
    year: typeof metadata.year === "number" ? String(metadata.year) : "",
    fuel: typeof metadata.fuel === "string" ? metadata.fuel : "",
    matriculationDate:
      typeof metadata.matriculation_date === "string" ? metadata.matriculation_date : "",
    codiceFiscale: asset?.codiceFiscale ?? "",
    birthDate: typeof metadata.birth_date === "string" ? metadata.birth_date : "",
    relationship: typeof metadata.relationship === "string" ? metadata.relationship : "",
    address: typeof metadata.address === "string" ? metadata.address : "",
    ownership: typeof metadata.ownership === "string" ? metadata.ownership : "",
  };
}

function buildMetadata(type: AssetType, state: FormState): Record<string, unknown> {
  switch (type) {
    case "vehicle":
      return {
        plate: state.plate.trim() || undefined,
        make: state.make.trim() || undefined,
        model: state.model.trim() || undefined,
        year: state.year.trim() ? Number(state.year) : undefined,
        fuel: state.fuel || undefined,
        matriculation_date: state.matriculationDate || undefined,
      };
    case "person":
      return {
        birth_date: state.birthDate || undefined,
        relationship: state.relationship || undefined,
      };
    case "home":
      return {
        address: state.address.trim() || undefined,
        ownership: state.ownership || undefined,
      };
    case "other":
      return {};
  }
}

/**
 * Create/edit dialog for all four asset types. One component, branching on
 * `type`, rather than four near-identical forms — the fields
 * barely overlap but the create/edit/submit plumbing is identical.
 */
export function AssetFormDialog({ open, onOpenChange, mode, type, asset }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Lazy initializer only: the caller mounts a fresh instance of this dialog
  // per open (see AddAssetButton / AssetDetailHeader), so there is no later
  // point where the fields need to reset — a `useEffect` doing that would
  // itself set state synchronously during commit, which React now flags.
  const [state, setState] = useState<FormState>(() => buildInitialState(type, asset));

  const plateWarning =
    type === "vehicle" && state.plate.trim() && !PLATE_REGEX.test(state.plate.trim().toUpperCase())
      ? "Formato targa insolito (es. AB123CD) — puoi salvare comunque."
      : null;

  const cfWarning =
    type === "person" && state.codiceFiscale.trim() && !isValidCodiceFiscale(state.codiceFiscale)
      ? "Codice fiscale non valido. Correggilo o svuota il campo."
      : null;

  function handleCodiceFiscaleChange(value: string) {
    const decoded = decodeCodiceFiscale(value);
    setState((current) => ({
      ...current,
      codiceFiscale: value,
      birthDate: decoded ? decoded.birthDate : current.birthDate,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (cfWarning) {
      toast.error(cfWarning);
      return;
    }

    const input =
      type === "person"
        ? {
            type,
            name: state.name,
            metadata: buildMetadata(type, state),
            codiceFiscale: state.codiceFiscale.trim() || undefined,
            notes: state.notes,
          }
        : { type, name: state.name, metadata: buildMetadata(type, state), notes: state.notes };

    startTransition(async () => {
      const result =
        mode === "edit" && asset ? await updateAsset(asset.id, input) : await createAsset(input);

      if (result.ok) {
        toast.success(mode === "edit" ? "Asset aggiornato." : "Asset creato.");
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
          <DialogTitle>
            {mode === "edit" ? `Modifica ${TYPE_LABELS[type].toLowerCase()}` : `Aggiungi ${TYPE_LABELS[type].toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Nome">
            <Input
              value={state.name}
              onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </Field>

          {type === "vehicle" ? (
            <>
              <Field label="Targa" hint={plateWarning ?? undefined}>
                <Input
                  value={state.plate}
                  onChange={(event) =>
                    setState((current) => ({ ...current, plate: event.target.value.toUpperCase() }))
                  }
                />
              </Field>
              <Field label="Marca">
                <Input
                  value={state.make}
                  onChange={(event) => setState((current) => ({ ...current, make: event.target.value }))}
                />
              </Field>
              <Field label="Modello">
                <Input
                  value={state.model}
                  onChange={(event) => setState((current) => ({ ...current, model: event.target.value }))}
                />
              </Field>
              <Field label="Anno">
                <Input
                  type="number"
                  value={state.year}
                  onChange={(event) => setState((current) => ({ ...current, year: event.target.value }))}
                />
              </Field>
              <Field label="Alimentazione">
                <NativeSelect
                  value={state.fuel}
                  onChange={(event) => setState((current) => ({ ...current, fuel: event.target.value }))}
                >
                  <option value="">— Non specificata —</option>
                  {VEHICLE_FUELS.map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {FUEL_LABELS[fuel]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Data immatricolazione">
                <Input
                  type="date"
                  value={state.matriculationDate}
                  onChange={(event) =>
                    setState((current) => ({ ...current, matriculationDate: event.target.value }))
                  }
                />
              </Field>
            </>
          ) : null}

          {type === "person" ? (
            <>
              <Field label="Codice fiscale" hint={cfWarning ?? undefined}>
                <Input
                  value={state.codiceFiscale}
                  onChange={(event) => handleCodiceFiscaleChange(event.target.value.toUpperCase())}
                  maxLength={16}
                />
              </Field>
              <Field label="Data di nascita">
                <Input
                  type="date"
                  value={state.birthDate}
                  onChange={(event) =>
                    setState((current) => ({ ...current, birthDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="Relazione">
                <NativeSelect
                  value={state.relationship}
                  onChange={(event) =>
                    setState((current) => ({ ...current, relationship: event.target.value }))
                  }
                >
                  <option value="">— Non specificata —</option>
                  {PERSON_RELATIONSHIPS.map((relationship) => (
                    <option key={relationship} value={relationship}>
                      {RELATIONSHIP_LABELS[relationship]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          ) : null}

          {type === "home" ? (
            <>
              <Field label="Indirizzo">
                <Input
                  value={state.address}
                  onChange={(event) =>
                    setState((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </Field>
              <Field label="Proprietà/affitto">
                <NativeSelect
                  value={state.ownership}
                  onChange={(event) =>
                    setState((current) => ({ ...current, ownership: event.target.value }))
                  }
                >
                  <option value="">— Non specificato —</option>
                  {HOME_OWNERSHIPS.map((ownership) => (
                    <option key={ownership} value={ownership}>
                      {OWNERSHIP_LABELS[ownership]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          ) : null}

          <Field label="Note">
            <Input
              value={state.notes}
              onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))}
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
