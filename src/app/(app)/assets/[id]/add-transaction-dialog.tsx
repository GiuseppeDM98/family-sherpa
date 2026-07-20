"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createTransaction } from "@/app/(app)/assets/actions";
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
import { DEADLINE_CATEGORIES } from "@/db/enums";
import { todayInRome } from "@/lib/date";
import { CATEGORY_LABELS } from "@/lib/deadline-labels";

type Category = (typeof DEADLINE_CATEGORIES)[number];

/** Manual expense entry on the asset cost tab (docs/specs/08 §3). */
export function AddTransactionDialog({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("altro");
  const [date, setDate] = useState(() => todayInRome());
  const [amountCents, setAmountCents] = useState<number | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTransaction(assetId, { title, category, date, amountCents });
      if (result.ok) {
        toast.success("Spesa aggiunta.");
        setOpen(false);
        setTitle("");
        setCategory("altro");
        setDate(todayInRome());
        setAmountCents(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon />
        Aggiungi spesa
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi spesa</DialogTitle>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field label="Titolo">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </Field>

            <Field label="Categoria">
              <NativeSelect value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                {DEADLINE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {CATEGORY_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Data">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </Field>

            <Field label="Importo (€)">
              <EuroInput value={amountCents} onChange={setAmountCents} required />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Annulla
              </Button>
              <Button type="submit" disabled={isPending || amountCents === null}>
                {isPending ? "Salvo…" : "Salva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
