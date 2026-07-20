"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatDateIt } from "@/lib/format";
import { deletePushSubscription } from "./actions";

/**
 * The user's registered push devices, each with a delete button
 * (docs/specs/07-reminders-notifications.md §4). Deleting here only drops the
 * server-side subscription row; the browser keeps its own until the user
 * re-subscribes, which upserts the same endpoint.
 */

export type PushDevice = {
  id: string;
  userAgent: string | null;
  createdAt: string;
};

/** A short human label for a device from its user-agent string. */
function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo sconosciuto";

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Browser";

  const platform =
    /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
    : /Android/.test(userAgent) ? "Android"
    : /Macintosh/.test(userAgent) ? "macOS"
    : /Windows/.test(userAgent) ? "Windows"
    : /Linux/.test(userAgent) ? "Linux"
    : "";

  return platform ? `${browser} · ${platform}` : browser;
}

export function PushDevices({ devices }: { devices: PushDevice[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await deletePushSubscription(id);
      router.refresh();
    });
  }

  if (devices.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Nessun dispositivo registrato.</p>
    );
  }

  return (
    <ul className="divide-border divide-y">
      {devices.map((device) => (
        <li key={device.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-medium">{deviceLabel(device.userAgent)}</p>
            <p className="text-muted-foreground text-xs">
              Aggiunto il {formatDateIt(device.createdAt.slice(0, 10))}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Rimuovi dispositivo"
            onClick={() => handleDelete(device.id)}
            disabled={isPending && deletingId === device.id}
          >
            <Trash2Icon />
          </Button>
        </li>
      ))}
    </ul>
  );
}
