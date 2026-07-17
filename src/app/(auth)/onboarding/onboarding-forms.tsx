"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFamily, joinFamily } from "./actions";

export function CreateFamilyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const name = String(formData.get("name") ?? "");

    startTransition(async () => {
      const result = await createFamily(name);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea la tua famiglia</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="family-name">Nome famiglia</Label>
            <Input id="family-name" name="name" required placeholder="Famiglia Rossi" />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creazione in corso…" : "Crea famiglia"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function JoinFamilyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const code = String(formData.get("code") ?? "");

    startTransition(async () => {
      const result = await joinFamily(code);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unisciti con un codice</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-code">Codice invito</Label>
            <Input
              id="invite-code"
              name="code"
              required
              placeholder="ABCD1234"
              className="uppercase"
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
            {isPending ? "Verifica in corso…" : "Unisciti"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
