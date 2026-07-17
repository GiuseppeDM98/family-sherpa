"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createTelegramLinkCode, unlinkTelegram } from "./actions";

type Props = {
  botUsername: string;
  link: { username: string | null } | null;
};

export function TelegramLinkCard({ botUsername, link }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ code: string; expiresInMinutes: number } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await createTelegramLinkCode();
      if (result.ok) {
        const expiresInMinutes = Math.max(
          0,
          Math.round((new Date(result.expiresAt).getTime() - Date.now()) / 60_000),
        );
        setGenerated({ code: result.code, expiresInMinutes });
      } else {
        setError(result.error);
      }
    });
  }

  function handleUnlink() {
    setError(null);
    startTransition(async () => {
      const result = await unlinkTelegram();
      if (result.ok) {
        setGenerated(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(`/collega ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          Collegato{link.username ? ` come @${link.username}` : ""} ✅
        </p>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="button" variant="outline" size="sm" onClick={handleUnlink} disabled={isPending}>
          {isPending ? "Scollegamento…" : "Scollega"}
        </Button>
      </div>
    );
  }

  if (generated) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="bg-muted rounded-md px-2.5 py-1 font-mono text-lg tracking-wider">
            {generated.code}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleCopy(generated.code)}
            aria-label="Copia comando"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Scrivi al bot <span className="font-medium">@{botUsername}</span>:{" "}
          <code className="font-mono">/collega {generated.code}</code>
        </p>
        <p className="text-muted-foreground text-xs">Scade tra {generated.expiresInMinutes} minuti.</p>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={isPending}>
          {isPending ? "Generazione…" : "Genera un nuovo codice"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="button" onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generazione…" : "Genera codice"}
      </Button>
    </div>
  );
}
