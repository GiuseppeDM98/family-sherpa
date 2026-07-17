import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { AddAssetButton } from "./add-asset-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { assets, deadlines } from "@/db/schema";
import { ASSET_TYPES } from "@/db/enums";
import { todayInRome } from "@/lib/date";
import { formatDateIt } from "@/lib/format";
import { requireFamily } from "@/lib/session";

type AssetType = (typeof ASSET_TYPES)[number];

const SECTION_LABELS: Record<AssetType, string> = {
  vehicle: "🚗 Veicoli",
  person: "👤 Persone",
  home: "🏠 Casa",
  other: "📦 Altro",
};

const SECTION_ORDER: AssetType[] = ["vehicle", "person", "home", "other"];

/** Card metadata line: plate / birth date / address (spec 06 §2). */
function metadataLine(type: AssetType, metadata: Record<string, unknown>): string | null {
  switch (type) {
    case "vehicle":
      return typeof metadata.plate === "string" && metadata.plate ? metadata.plate : null;
    case "person":
      return typeof metadata.birth_date === "string" && metadata.birth_date
        ? formatDateIt(metadata.birth_date)
        : null;
    case "home":
      return typeof metadata.address === "string" && metadata.address ? metadata.address : null;
    case "other":
      return null;
  }
}

export default async function AssetsPage() {
  const { familyId } = await requireFamily();
  const todayYmd = todayInRome();

  const familyAssets = await db
    .select()
    .from(assets)
    .where(and(eq(assets.family_id, familyId), eq(assets.archived, false)));

  // One query for every asset's pending-deadline count/overdue flag, instead
  // of one query per asset (00-overview.md perf guidance: no N+1).
  const pendingDeadlines = await db
    .select({ asset_id: deadlines.asset_id, due_date: deadlines.due_date })
    .from(deadlines)
    .where(and(eq(deadlines.family_id, familyId), eq(deadlines.status, "pending")));

  const deadlineStats = new Map<string, { count: number; overdue: boolean }>();
  for (const row of pendingDeadlines) {
    if (!row.asset_id) continue;
    const current = deadlineStats.get(row.asset_id) ?? { count: 0, overdue: false };
    current.count += 1;
    if (row.due_date < todayYmd) current.overdue = true;
    deadlineStats.set(row.asset_id, current);
  }

  const sections = SECTION_ORDER.map((type) => ({
    type,
    items: familyAssets.filter((asset) => asset.type === type),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Asset</h1>
        <AddAssetButton />
      </div>

      {sections.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nessun asset ancora. Aggiungine uno, oppure mandami un vocale o una foto e lo creo io.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.type} className="space-y-2">
            <h2 className="text-sm font-medium">{SECTION_LABELS[section.type]}</h2>
            <div className="space-y-2">
              {section.items.map((asset) => {
                const stats = deadlineStats.get(asset.id);
                const meta = metadataLine(asset.type, asset.metadata);
                return (
                  <Link key={asset.id} href={`/assets/${asset.id}`} className="block">
                    <Card>
                      <CardContent className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{asset.name}</p>
                          {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
                        </div>
                        {stats && stats.count > 0 ? (
                          <Badge
                            variant={stats.overdue ? "destructive" : "secondary"}
                            className="shrink-0"
                          >
                            {stats.count}
                          </Badge>
                        ) : null}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
