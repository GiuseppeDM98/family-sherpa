"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeadlineFormDialog } from "./deadline-form-dialog";
import type { DeadlineFormAsset, VehicleDeadlineContext } from "./types";

/** Trigger + dialog for "Aggiungi scadenza", shared by `/deadlines` and the asset detail page. */
export function AddDeadlineButton({
  assets,
  fixedAssetId,
  vehicleContext,
  label = "Aggiungi scadenza",
}: {
  assets: DeadlineFormAsset[];
  fixedAssetId?: string;
  vehicleContext?: VehicleDeadlineContext;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </Button>
      {open ? (
        <DeadlineFormDialog
          open
          onOpenChange={setOpen}
          mode="create"
          assets={assets}
          fixedAssetId={fixedAssetId}
          vehicleContext={vehicleContext}
        />
      ) : null}
    </>
  );
}
