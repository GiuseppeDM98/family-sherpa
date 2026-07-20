"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { todayInRome } from "@/lib/date";
import { defaultTherapyTimes } from "@/lib/inbound/therapy-times";
import { createTherapy } from "./actions";
import type { CabinetMedication, PersonAsset } from "./types";

const TIMES_PER_DAY_OPTIONS = [1, 2, 3, 4, 5, 6];
const FREE_TEXT_MEDICATION = "free";

/** "Crea terapia manualmente" (spec 09 §2). */
export function TherapyFormDialog({
  personAssets,
  cabinetMedications,
}: {
  personAssets: PersonAsset[];
  cabinetMedications: CabinetMedication[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [medicationSource, setMedicationSource] = useState(FREE_TEXT_MEDICATION);
  const [medicationName, setMedicationName] = useState("");
  const [personAssetId, setPersonAssetId] = useState(personAssets[0]?.id ?? "");
  const [dosageText, setDosageText] = useState("");
  const [timesPerDay, setTimesPerDay] = useState(2);
  const [times, setTimes] = useState<string[]>(() => defaultTherapyTimes(2));
  const [startDate, setStartDate] = useState(() => todayInRome());
  const [durationDays, setDurationDays] = useState("");

  function handleTimesPerDayChange(value: number) {
    setTimesPerDay(value);
    setTimes(defaultTherapyTimes(value));
  }

  function reset() {
    setMedicationSource(FREE_TEXT_MEDICATION);
    setMedicationName("");
    setPersonAssetId(personAssets[0]?.id ?? "");
    setDosageText("");
    setTimesPerDay(2);
    setTimes(defaultTherapyTimes(2));
    setStartDate(todayInRome());
    setDurationDays("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const selectedMedication =
      medicationSource !== FREE_TEXT_MEDICATION
        ? cabinetMedications.find((medication) => medication.id === medicationSource)
        : undefined;

    startTransition(async () => {
      const result = await createTherapy({
        medicationName: selectedMedication ? selectedMedication.name : medicationName,
        medicationId: selectedMedication?.id,
        personAssetId,
        dosageText,
        timesPerDay,
        times,
        startDate,
        durationDays: durationDays ? Number(durationDays) : undefined,
      });
      if (result.ok) {
        toast.success("Terapia creata.");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Crea terapia
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea terapia</DialogTitle>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field label="Farmaco">
              <NativeSelect
                value={medicationSource}
                onChange={(event) => setMedicationSource(event.target.value)}
              >
                <option value={FREE_TEXT_MEDICATION}>Scrivi il nome…</option>
                {cabinetMedications.map((medication) => (
                  <option key={medication.id} value={medication.id}>
                    {medication.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {medicationSource === FREE_TEXT_MEDICATION ? (
              <Field label="Nome farmaco">
                <Input
                  value={medicationName}
                  onChange={(event) => setMedicationName(event.target.value)}
                  required
                />
              </Field>
            ) : null}

            <Field label="Persona">
              <NativeSelect
                value={personAssetId}
                onChange={(event) => setPersonAssetId(event.target.value)}
                required
              >
                <option value="" disabled>
                  — Seleziona —
                </option>
                {personAssets.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Posologia" hint='Es. "1 compressa dopo i pasti"'>
              <Input value={dosageText} onChange={(event) => setDosageText(event.target.value)} required />
            </Field>

            <Field label="Volte al giorno">
              <NativeSelect
                value={String(timesPerDay)}
                onChange={(event) => handleTimesPerDayChange(Number(event.target.value))}
              >
                {TIMES_PER_DAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </Field>

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

            <Field label="Data inizio">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </Field>

            <Field label="Durata (giorni)" hint="Facoltativa — lascia vuoto per una terapia continuativa">
              <Input
                type="number"
                min="1"
                inputMode="numeric"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Annulla
              </Button>
              <Button type="submit" disabled={isPending || !personAssetId || !dosageText.trim()}>
                {isPending ? "Salvo…" : "Salva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
