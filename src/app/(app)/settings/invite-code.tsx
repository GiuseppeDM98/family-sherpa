"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted rounded-md px-2.5 py-1 font-mono text-sm tracking-wider">
        {code}
      </code>
      <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copia codice invito">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  );
}
