import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Native select styled like `Input` — the project has no shadcn Select yet. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full min-w-0 rounded-lg border px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/**
 * Euro input backed by integer cents. The value stays in cents in state (the
 * app's money convention, 00-overview.md §6); the number input handles the
 * locale's decimal separator, so no comma parsing here.
 */
export function EuroInput({
  value,
  onChange,
  required,
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
  required?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      required={required}
      value={value === null ? "" : value / 100}
      onChange={(event) => {
        const euros = event.target.valueAsNumber;
        onChange(Number.isNaN(euros) ? null : Math.round(euros * 100));
      }}
    />
  );
}
