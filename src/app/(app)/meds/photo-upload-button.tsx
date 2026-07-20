"use client";

import { CameraIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { submitAppMessage } from "@/app/(app)/inbox/actions";
import { Button } from "@/components/ui/button";

/**
 * "Fotografa la scatola": the same in-app upload pipeline as the Inbox, just
 * a file input pre-filtered to photos with the
 * rear camera preferred on mobile. No new ingestion code — this only builds
 * the `FormData` and hands it to the existing `submitAppMessage` action, then
 * sends the user to the confirm/edit screen for the extracted medication.
 */
export function PhotoUploadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("text", "");
    formData.set("file", file);

    startTransition(async () => {
      const result = await submitAppMessage(formData);
      if (inputRef.current) inputRef.current.value = "";
      if (result.ok) {
        router.push(`/inbox/${result.inboxMessageId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
      />
      <Button size="sm" onClick={() => inputRef.current?.click()} disabled={isPending}>
        <CameraIcon />
        {isPending ? "Analizzo…" : "Fotografa la scatola"}
      </Button>
    </>
  );
}
