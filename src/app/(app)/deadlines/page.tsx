import { and, asc, eq } from "drizzle-orm";
import { AddDeadlineButton } from "@/components/deadlines/add-deadline-button";
import { db } from "@/db";
import { assets, deadlines } from "@/db/schema";
import { todayInRome } from "@/lib/date";
import { requireFamily } from "@/lib/session";
import { DeadlinesList, type DeadlineListRow } from "./deadlines-list";

export default async function DeadlinesPage() {
  const { familyId } = await requireFamily();
  const todayYmd = todayInRome();

  const rows: DeadlineListRow[] = await db
    .select({
      id: deadlines.id,
      category: deadlines.category,
      title: deadlines.title,
      due_date: deadlines.due_date,
      amount_cents: deadlines.amount_cents,
      recurrence: deadlines.recurrence,
      status: deadlines.status,
      asset_id: deadlines.asset_id,
      remind_at: deadlines.remind_at,
      assetName: assets.name,
      assetType: assets.type,
    })
    .from(deadlines)
    .leftJoin(assets, eq(deadlines.asset_id, assets.id))
    .where(and(eq(deadlines.family_id, familyId), eq(deadlines.status, "pending")))
    .orderBy(asc(deadlines.due_date));

  const familyAssets = await db
    .select({ id: assets.id, name: assets.name, type: assets.type })
    .from(assets)
    .where(and(eq(assets.family_id, familyId), eq(assets.archived, false)));

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Scadenze</h1>
        <AddDeadlineButton assets={familyAssets} />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nessuna scadenza in vista. Inoltra un avviso al bot Telegram o aggiungi a mano.
        </p>
      ) : (
        <DeadlinesList rows={rows} assets={familyAssets} todayYmd={todayYmd} />
      )}
    </div>
  );
}
