"use client";

import { CarIcon, HomeIcon, PackageIcon, PlusIcon, UserIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { AssetFormDialog } from "@/app/(app)/assets/asset-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ASSET_TYPES } from "@/db/enums";

type AssetType = (typeof ASSET_TYPES)[number];

const TYPE_OPTIONS: { type: AssetType; label: string; icon: LucideIcon }[] = [
  { type: "vehicle", label: "Veicolo", icon: CarIcon },
  { type: "person", label: "Persona", icon: UserIcon },
  { type: "home", label: "Casa", icon: HomeIcon },
  { type: "other", label: "Altro", icon: PackageIcon },
];

/** "Aggiungi asset": a type picker, then the matching create form (spec 06 §2). */
export function AddAssetButton() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formType, setFormType] = useState<AssetType | null>(null);

  return (
    <>
      <Button size="sm" onClick={() => setPickerOpen(true)}>
        <PlusIcon />
        Aggiungi asset
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Che tipo di asset?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((option) => (
              <Button
                key={option.type}
                type="button"
                variant="outline"
                className="h-16 flex-col gap-1"
                onClick={() => {
                  setPickerOpen(false);
                  setFormType(option.type);
                }}
              >
                <option.icon className="size-5" aria-hidden />
                {option.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {formType ? (
        <AssetFormDialog
          open={formType !== null}
          onOpenChange={(open) => {
            if (!open) setFormType(null);
          }}
          mode="create"
          type={formType}
        />
      ) : null}
    </>
  );
}
