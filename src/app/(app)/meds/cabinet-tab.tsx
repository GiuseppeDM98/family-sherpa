"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicationCard } from "./medication-card";
import { MedicationFormDialog } from "./medication-form-dialog";
import { PhotoUploadButton } from "./photo-upload-button";
import type { CabinetMedication } from "./types";

/** Armadietto tab: search-as-you-filter list, sorted expiring-first by the server. */
export function CabinetTab({
  medications,
  todayYmd,
}: {
  medications: CabinetMedication[];
  todayYmd: string;
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = medications.filter((medication) =>
    medication.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <PhotoUploadButton />
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <PlusIcon />
          Aggiungi a mano
        </Button>
      </div>

      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca farmaco…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {medications.length === 0 ? "Nessun farmaco nell'armadietto." : "Nessun risultato."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} todayYmd={todayYmd} />
          ))}
        </div>
      )}

      {addOpen ? <MedicationFormDialog open onOpenChange={setAddOpen} mode="create" /> : null}
    </div>
  );
}
