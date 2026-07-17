import { and, asc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDeadlineButton } from "@/components/deadlines/add-deadline-button";
import { DeadlineRow } from "@/components/deadlines/deadline-row";
import type { DeadlineListRow } from "@/app/(app)/deadlines/deadlines-list";
import { db } from "@/db";
import { assets, deadlines, transactions } from "@/db/schema";
import type { ASSET_TYPES } from "@/db/enums";
import { decryptField } from "@/lib/crypto";
import { addMonthsToYmd, todayInRome } from "@/lib/date";
import { formatDateIt, formatEuroCents } from "@/lib/format";
import { requireFamily } from "@/lib/session";
import { AssetDetailHeader } from "./asset-detail-header";
import { CfReveal } from "./cf-reveal";

type AssetType = (typeof ASSET_TYPES)[number];

const TYPE_LABELS: Record<AssetType, string> = {
  vehicle: "Veicolo",
  person: "Persona",
  home: "Casa",
  other: "Altro",
};

const OWNERSHIP_LABELS: Record<string, string> = { "proprietà": "Proprietà", affitto: "Affitto" };
const RELATIONSHIP_LABELS: Record<string, string> = { adulto: "Adulto", bambino: "Bambino", altro: "Altro" };

function headerSummary(type: AssetType, metadata: Record<string, unknown>): string | null {
  const parts: string[] = [];
  switch (type) {
    case "vehicle": {
      if (typeof metadata.plate === "string" && metadata.plate) parts.push(metadata.plate);
      const makeModel = [metadata.make, metadata.model].filter((v) => typeof v === "string" && v).join(" ");
      if (makeModel) parts.push(makeModel);
      if (typeof metadata.year === "number") parts.push(String(metadata.year));
      if (typeof metadata.matriculation_date === "string" && metadata.matriculation_date) {
        parts.push(`immatr. ${formatDateIt(metadata.matriculation_date)}`);
      }
      break;
    }
    case "person": {
      if (typeof metadata.birth_date === "string" && metadata.birth_date) {
        parts.push(`Nato/a il ${formatDateIt(metadata.birth_date)}`);
      }
      if (typeof metadata.relationship === "string" && metadata.relationship) {
        parts.push(RELATIONSHIP_LABELS[metadata.relationship] ?? metadata.relationship);
      }
      break;
    }
    case "home": {
      if (typeof metadata.address === "string" && metadata.address) parts.push(metadata.address);
      if (typeof metadata.ownership === "string" && metadata.ownership) {
        parts.push(OWNERSHIP_LABELS[metadata.ownership] ?? metadata.ownership);
      }
      break;
    }
    case "other":
      break;
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { familyId } = await requireFamily();
  const todayYmd = todayInRome();

  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.family_id, familyId)));
  if (!asset) notFound();

  const assetDeadlines = await db
    .select()
    .from(deadlines)
    .where(and(eq(deadlines.asset_id, asset.id), eq(deadlines.family_id, familyId)))
    .orderBy(asc(deadlines.due_date));

  const pending: DeadlineListRow[] = assetDeadlines
    .filter((deadline) => deadline.status === "pending")
    .map((deadline) => ({ ...deadline, assetName: null, assetType: null }));
  const history: DeadlineListRow[] = assetDeadlines
    .filter((deadline) => deadline.status !== "pending")
    .map((deadline) => ({ ...deadline, assetName: null, assetType: null }));

  const twelveMonthsAgo = addMonthsToYmd(todayYmd, -12);
  const recentTransactions = await db
    .select({ amount_cents: transactions.amount_cents })
    .from(transactions)
    .where(
      and(
        eq(transactions.asset_id, asset.id),
        eq(transactions.family_id, familyId),
        gte(transactions.date, twelveMonthsAgo),
      ),
    );
  const tcoCents = recentTransactions.reduce((sum, row) => sum + row.amount_cents, 0);

  const codiceFiscale = asset.codice_fiscale_enc ? decryptField(asset.codice_fiscale_enc) : null;
  const notes = asset.notes_enc ? decryptField(asset.notes_enc) : null;

  const vehicleContext =
    asset.type === "vehicle"
      ? {
          matriculationDate:
            typeof asset.metadata.matriculation_date === "string"
              ? asset.metadata.matriculation_date
              : null,
          hasExistingRevisione: assetDeadlines.some((deadline) => deadline.category === "revisione"),
        }
      : undefined;

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-1">
        <Link href="/assets" className="text-muted-foreground text-sm hover:underline">
          ← Asset
        </Link>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{asset.name}</h1>
            <p className="text-muted-foreground text-sm">{TYPE_LABELS[asset.type]}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        {headerSummary(asset.type, asset.metadata) ? (
          <p>{headerSummary(asset.type, asset.metadata)}</p>
        ) : null}
        {codiceFiscale ? (
          <p className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Codice fiscale:</span>
            <CfReveal value={codiceFiscale} />
          </p>
        ) : null}
        {notes ? <p className="text-muted-foreground">{notes}</p> : null}
      </div>

      <AssetDetailHeader
        asset={{
          id: asset.id,
          type: asset.type,
          name: asset.name,
          metadata: asset.metadata,
          codiceFiscale,
          notes,
        }}
      />

      {asset.type === "vehicle" || asset.type === "home" ? (
        <p className="text-muted-foreground text-sm">
          Spese ultimi 12 mesi: <span className="text-foreground font-medium">{formatEuroCents(tcoCents)}</span>
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Scadenze</h2>
        <AddDeadlineButton assets={[]} fixedAssetId={asset.id} vehicleContext={vehicleContext} />
      </div>

      {pending.length === 0 && history.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna scadenza per questo asset.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((deadline) => (
            <DeadlineRow
              key={deadline.id}
              deadline={deadline}
              todayYmd={todayYmd}
              assets={[]}
              fixedAssetId={asset.id}
              vehicleContext={vehicleContext}
            />
          ))}
        </div>
      )}

      {history.length > 0 ? (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm font-medium">
            Completate ({history.length})
          </summary>
          <div className="mt-2 space-y-2">
            {history.map((deadline) => (
              <DeadlineRow
                key={deadline.id}
                deadline={deadline}
                todayYmd={todayYmd}
                assets={[]}
                fixedAssetId={asset.id}
                vehicleContext={vehicleContext}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
