import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { CashFlowChart } from "@/app/(app)/dashboard/cash-flow-chart";
import { AssetSpendList } from "@/app/(app)/dashboard/asset-spend-list";
import { OnboardingCard } from "@/app/(app)/dashboard/onboarding-card";
import { buildPeakCallout, findPeakMonth } from "@/app/(app)/dashboard/peak-callout";
import { DeadlineRow } from "@/components/deadlines/deadline-row";
import { PushPermission } from "@/components/push-permission";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { assets, deadlines, therapies, therapyIntakes, users } from "@/db/schema";
import { getCashFlowForecast, getFamilySpendSummary } from "@/lib/analytics";
import { todayInRome } from "@/lib/date";
import { clientEnv } from "@/lib/env";
import { requireFamily } from "@/lib/session";

const GREETING_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function HomePage() {
  const { familyId, userId } = await requireFamily();
  const todayYmd = todayInRome();

  const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  const firstName = me?.name?.split(" ")[0] ?? "";

  const upcomingRows = await db
    .select({
      id: deadlines.id,
      category: deadlines.category,
      title: deadlines.title,
      due_date: deadlines.due_date,
      amount_cents: deadlines.amount_cents,
      recurrence: deadlines.recurrence,
      status: deadlines.status,
      asset_id: deadlines.asset_id,
      assetName: assets.name,
    })
    .from(deadlines)
    .leftJoin(assets, eq(deadlines.asset_id, assets.id))
    .where(and(eq(deadlines.family_id, familyId), eq(deadlines.status, "pending")))
    .orderBy(asc(deadlines.due_date))
    .limit(5);

  const familyAssets = await db
    .select({ id: assets.id, name: assets.name, type: assets.type })
    .from(assets)
    .where(and(eq(assets.family_id, familyId), eq(assets.archived, false)));

  const pendingTherapyIntakes = await db
    .select({ scheduled_at: therapyIntakes.scheduled_at })
    .from(therapyIntakes)
    .innerJoin(therapies, eq(therapyIntakes.therapy_id, therapies.id))
    .where(and(eq(therapies.family_id, familyId), eq(therapyIntakes.status, "pending")));
  const todayTherapyCount = pendingTherapyIntakes.filter(
    (intake) => todayInRome(new Date(intake.scheduled_at)) === todayYmd,
  ).length;

  const forecast = await getCashFlowForecast(familyId, 12);
  const spendSummary = await getFamilySpendSummary(familyId);

  const totalForecastCents = forecast.reduce((sum, month) => sum + month.totalCents, 0);
  const isEmptyFamily =
    upcomingRows.length === 0 && totalForecastCents === 0 && spendSummary.byAsset.length === 0;

  const peakMonth = findPeakMonth(forecast);
  const peakCallout = buildPeakCallout(forecast);

  return (
    <div className="space-y-4 py-4">
      <PushPermission vapidPublicKey={clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY} variant="banner" />

      <div>
        <h1 className="text-2xl font-semibold">Ciao{firstName ? ` ${firstName}` : ""} 👋</h1>
        <p className="text-muted-foreground text-sm">{capitalize(GREETING_DATE_FORMATTER.format(new Date()))}</p>
      </div>

      {isEmptyFamily ? (
        <OnboardingCard />
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Prossime scadenze</h2>
              <Link href="/deadlines" className="text-primary text-sm hover:underline">
                Vedi tutte
              </Link>
            </div>
            {todayTherapyCount > 0 ? (
              <Link href="/meds" className="block">
                <Card>
                  <CardContent className="text-sm">
                    💊 Oggi: {todayTherapyCount} {todayTherapyCount === 1 ? "somministrazione" : "somministrazioni"}
                  </CardContent>
                </Card>
              </Link>
            ) : null}
            {upcomingRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessuna scadenza in vista.</p>
            ) : (
              <div className="space-y-2">
                {upcomingRows.map((row) => (
                  <DeadlineRow
                    key={row.id}
                    deadline={row}
                    assetName={row.assetName}
                    todayYmd={todayYmd}
                    assets={familyAssets}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Cash flow — prossimi 12 mesi</h2>
            <Card>
              <CardContent>
                <CashFlowChart forecast={forecast} peakMonth={peakMonth} />
              </CardContent>
            </Card>
            {peakCallout ? <p className="text-sm">{peakCallout}</p> : null}
          </section>

          {spendSummary.byAsset.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Costo dei tuoi asset (ultimi 12 mesi)</h2>
              <AssetSpendList byAsset={spendSummary.byAsset} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
