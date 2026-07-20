"use client";

import { ArchiveIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveAsset } from "@/app/(app)/assets/actions";
import { AssetFormDialog, type EditableAsset } from "@/app/(app)/assets/asset-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { ASSET_TYPES } from "@/db/enums";

/** Edit + archive actions for the asset detail header. */
export function AssetDetailHeader({
  asset,
}: {
  asset: EditableAsset & { type: (typeof ASSET_TYPES)[number] };
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveAsset(asset.id);
      if (result.ok) {
        toast.success("Asset archiviato.");
        router.push("/assets");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
        <PencilIcon />
        Modifica
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
        <ArchiveIcon />
        Archivia
      </Button>

      {editOpen ? (
        <AssetFormDialog
          open
          onOpenChange={setEditOpen}
          mode="edit"
          type={asset.type}
          asset={asset}
        />
      ) : null}
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiviare l'asset?"
        description={`«${asset.name}» non sarà più visibile negli elenchi. Scadenze e spese collegate restano disponibili nello storico.`}
        confirmLabel="Archivia"
        onConfirm={handleArchive}
        isPending={isPending}
      />
    </div>
  );
}
