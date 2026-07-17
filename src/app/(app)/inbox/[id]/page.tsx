import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { assets, inboxMessages } from "@/db/schema";
import { ParseResultSchema } from "@/lib/ai/parse-schema";
import { formatRelativeTimeIt } from "@/lib/format";
import { requireFamily } from "@/lib/session";
import { InboxItemsForm } from "./inbox-items-form";

const STATUS_LABELS: Record<string, string> = {
  received: "In elaborazione…",
  parsed: "Da confermare",
  confirmed: "Salvato",
  rejected: "Annullato",
  failed: "Non capito",
};

export default async function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { familyId } = await requireFamily();

  const [message] = await db
    .select()
    .from(inboxMessages)
    .where(and(eq(inboxMessages.id, id), eq(inboxMessages.family_id, familyId)));

  if (!message) notFound();

  const familyAssets = await db
    .select({ id: assets.id, name: assets.name, type: assets.type })
    .from(assets)
    .where(and(eq(assets.family_id, familyId), eq(assets.archived, false)));

  const parsed = message.parse_result
    ? ParseResultSchema.safeParse(JSON.parse(message.parse_result))
    : null;
  const originalText = message.transcription ?? message.raw_text;

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-1">
        <Link href="/inbox" className="text-muted-foreground text-sm hover:underline">
          ← Inbox
        </Link>
        <h1 className="text-2xl font-semibold">
          {STATUS_LABELS[message.status] ?? message.status}
        </h1>
        <p className="text-muted-foreground text-sm">
          {message.channel === "telegram" ? "Da Telegram" : "Dall'app"} ·{" "}
          {formatRelativeTimeIt(message.created_at)}
        </p>
      </div>

      {originalText ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {message.transcription ? "Trascrizione" : "Messaggio"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{originalText}</p>
          </CardContent>
        </Card>
      ) : null}

      {message.status === "failed" ? (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm">😓 Non sono riuscito ad analizzare questo messaggio.</p>
            {message.parse_error ? (
              <p className="text-muted-foreground font-mono text-xs break-all">
                {message.parse_error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {parsed?.success ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Cosa ho capito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{parsed.data.summary_it}</p>
              {parsed.data.notes ? (
                <p className="text-muted-foreground text-sm">⚠️ {parsed.data.notes}</p>
              ) : null}
            </CardContent>
          </Card>

          {message.status === "parsed" ? (
            <InboxItemsForm
              inboxMessageId={message.id}
              initialItems={parsed.data.items}
              assets={familyAssets}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
