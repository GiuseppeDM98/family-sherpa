"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Masked codice fiscale ("RSSMRA…") with a reveal toggle. */
export function CfReveal({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm">
      {revealed ? value : `${value.slice(0, 6)}…`}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? "Nascondi codice fiscale" : "Mostra codice fiscale"}
      >
        {revealed ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </span>
  );
}
