"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEADLINE_CATEGORIES, RECURRENCES, type ASSET_TYPES } from "@/db/enums";
import type { ParseResultItem } from "@/lib/ai/parse-schema";
import { cn } from "@/lib/utils";
import { confirmInboxMessage, rejectInboxMessage } from "../actions";

type FamilyAsset = { id: string; name: string; type: (typeof ASSET_TYPES)[number] };

type Props = {
  inboxMessageId: string;
  initialItems: ParseResultItem[];
  assets: FamilyAsset[];
};

const ITEM_TITLES: Record<ParseResultItem["type"], string> = {
  deadline: "📅 Scadenza",
  transaction: "💸 Spesa",
  therapy: "💊 Terapia",
  medication: "💊 Farmaco",
};

const RECURRENCE_LABELS: Record<(typeof RECURRENCES)[number], string> = {
  none: "Nessuna",
  monthly: "Mensile",
  bimonthly: "Bimestrale",
  quarterly: "Trimestrale",
  semiannual: "Semestrale",
  annual: "Annuale",
  biennial: "Biennale",
};

/** Native select styled like `Input` — the project has no shadcn Select yet. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full min-w-0 rounded-lg border px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AssetSelect({
  assets,
  value,
  onChange,
}: {
  assets: FamilyAsset[];
  value: string | null;
  onChange: (assetId: string | null) => void;
}) {
  return (
    <Select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
      <option value="">— Nessuno —</option>
      {assets.map((asset) => (
        <option key={asset.id} value={asset.id}>
          {asset.name}
        </option>
      ))}
    </Select>
  );
}

/**
 * Euro input backed by integer cents. The value stays in cents in state (the
 * app's money convention); the number input handles the locale's decimal
 * separator, so no comma parsing here.
 */
function EuroInput({
  value,
  onChange,
  required,
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
  required?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      required={required}
      value={value === null ? "" : value / 100}
      onChange={(event) => {
        const euros = event.target.valueAsNumber;
        onChange(Number.isNaN(euros) ? null : Math.round(euros * 100));
      }}
    />
  );
}

export function InboxItemsForm({ inboxMessageId, initialItems, assets }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ParseResultItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  function updateItem(index: number, patch: Partial<ParseResultItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? ({ ...item, ...patch } as ParseResultItem) : item)),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmInboxMessage(inboxMessageId, items);
      if (result.ok) {
        toast.success("Salvato!");
        router.push(result.redirectTo);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectInboxMessage(inboxMessageId);
      if (result.ok) {
        toast.success("Annullato.");
        router.push("/inbox");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Non è rimasto nulla da salvare da questo messaggio.
          </p>
          <Button variant="outline" onClick={handleReject} disabled={isPending} className="w-full">
            Rifiuta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{ITEM_TITLES[item.type]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.type === "deadline" || item.type === "transaction" ? (
              <>
                <Field label="Titolo">
                  <Input
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                  />
                </Field>
                <Field label="Categoria">
                  <Select
                    value={item.category}
                    onChange={(event) =>
                      updateItem(index, {
                        category: event.target.value as (typeof DEADLINE_CATEGORIES)[number],
                      })
                    }
                  >
                    {DEADLINE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {item.type === "deadline" ? (
              <>
                <Field label="Scadenza">
                  <Input
                    type="date"
                    value={item.due_date}
                    onChange={(event) => updateItem(index, { due_date: event.target.value })}
                  />
                </Field>
                <Field label="Importo (€)">
                  <EuroInput
                    value={item.amount_cents}
                    onChange={(amount_cents) => updateItem(index, { amount_cents })}
                  />
                </Field>
                <Field label="Ricorrenza">
                  <Select
                    value={item.recurrence}
                    onChange={(event) =>
                      updateItem(index, {
                        recurrence: event.target.value as (typeof RECURRENCES)[number],
                      })
                    }
                  >
                    {RECURRENCES.map((recurrence) => (
                      <option key={recurrence} value={recurrence}>
                        {RECURRENCE_LABELS[recurrence]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Asset">
                  <AssetSelect
                    assets={assets}
                    value={item.asset_id}
                    onChange={(asset_id) => updateItem(index, { asset_id })}
                  />
                </Field>
                {item.asset_id === null && item.asset_suggestion ? (
                  <p className="text-muted-foreground text-xs">
                    Se lasci vuoto, creo un nuovo asset: «{item.asset_suggestion}».
                  </p>
                ) : null}
              </>
            ) : null}

            {item.type === "transaction" ? (
              <>
                <Field label="Data">
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(event) => updateItem(index, { date: event.target.value })}
                  />
                </Field>
                <Field label="Importo (€)">
                  <EuroInput
                    required
                    value={item.amount_cents}
                    onChange={(amount_cents) =>
                      updateItem(index, { amount_cents: amount_cents ?? 0 })
                    }
                  />
                </Field>
                <Field label="Asset">
                  <AssetSelect
                    assets={assets}
                    value={item.asset_id}
                    onChange={(asset_id) => updateItem(index, { asset_id })}
                  />
                </Field>
              </>
            ) : null}

            {item.type === "therapy" ? (
              <>
                <Field label="Farmaco">
                  <Input
                    value={item.medication_name}
                    onChange={(event) =>
                      updateItem(index, { medication_name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Posologia">
                  <Input
                    value={item.dosage_text}
                    onChange={(event) => updateItem(index, { dosage_text: event.target.value })}
                  />
                </Field>
                <Field label="Volte al giorno">
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={item.times_per_day}
                    onChange={(event) =>
                      updateItem(index, { times_per_day: event.target.valueAsNumber })
                    }
                  />
                </Field>
                <Field label="Durata (giorni)">
                  <Input
                    type="number"
                    min="1"
                    value={item.duration_days ?? ""}
                    onChange={(event) =>
                      updateItem(index, {
                        duration_days: Number.isNaN(event.target.valueAsNumber)
                          ? null
                          : event.target.valueAsNumber,
                      })
                    }
                  />
                </Field>
                <Field label="Persona">
                  <AssetSelect
                    assets={assets.filter((asset) => asset.type === "person")}
                    value={item.person_asset_id}
                    onChange={(person_asset_id) => updateItem(index, { person_asset_id })}
                  />
                </Field>
                {item.person_asset_id === null && item.person_suggestion ? (
                  <p className="text-muted-foreground text-xs">
                    Se lasci vuoto, creo una nuova persona: «{item.person_suggestion}».
                  </p>
                ) : null}
              </>
            ) : null}

            {item.type === "medication" ? (
              <>
                <Field label="Nome">
                  <Input
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
                  />
                </Field>
                <Field label="Formato">
                  <Input
                    value={item.format ?? ""}
                    onChange={(event) =>
                      updateItem(index, { format: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="Codice AIC">
                  <Input
                    value={item.aic_code ?? ""}
                    onChange={(event) =>
                      updateItem(index, { aic_code: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="Scadenza">
                  <Input
                    type="date"
                    value={item.expiry_date ?? ""}
                    onChange={(event) =>
                      updateItem(index, { expiry_date: event.target.value || null })
                    }
                  />
                </Field>
              </>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(index)}
              disabled={isPending}
            >
              <Trash2Icon />
              Rimuovi
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleConfirm} disabled={isPending} className="flex-1">
          {isPending ? "Salvo…" : "Conferma"}
        </Button>
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={isPending}
          className="flex-1"
        >
          Rifiuta
        </Button>
      </div>
    </div>
  );
}
