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
import { updateTherapyTimes } from "./actions";

/** "Modifica orari" action on a therapy card (spec 09 §2). */
export function EditTherapyTimesDialog({
  open,
  onOpenChange,
  therapyId,
  initialTimes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapyId: string;
  initialTimes: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [times, setTimes] = useState(initialTimes);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateTherapyTimes(therapyId, times);
      if (result.ok) {
        toast.success("Orari aggiornati.");
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
          <DialogTitle>Modifica orari</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Orari">
            <div className="grid grid-cols-2 gap-2">
              {times.map((time, index) => (
                <Input
                  key={index}
                  type="time"
                  value={time}
                  onChange={(event) => {
                    const next = [...times];
                    next[index] = event.target.value;
                    setTimes(next);
                  }}
                  required
                />
              ))}
            </div>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
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
