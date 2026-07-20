import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { ASSET_TYPES } from "@/db/enums";
import type { FamilySpendSummary } from "@/lib/analytics";
import { formatEuroCents } from "@/lib/format";

const TYPE_EMOJI: Record<(typeof ASSET_TYPES)[number], string> = {
  vehicle: "🚗",
  person: "👤",
  home: "🏠",
  other: "📦",
};

/** "Costo dei tuoi asset (ultimi 12 mesi)" — sorted desc, links to each asset's cost tab. */
export function AssetSpendList({ byAsset }: { byAsset: FamilySpendSummary["byAsset"] }) {
  return (
    <Card>
      <CardContent className="divide-border divide-y">
        {byAsset.map((asset) => (
          <Link
            key={asset.assetId}
            href={`/assets/${asset.assetId}?tab=costi`}
            className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden>{TYPE_EMOJI[asset.type as (typeof ASSET_TYPES)[number]] ?? "📦"}</span>
              <span className="truncate">{asset.assetName}</span>
            </span>
            <span className="shrink-0 font-medium">{formatEuroCents(asset.totalCents)}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
