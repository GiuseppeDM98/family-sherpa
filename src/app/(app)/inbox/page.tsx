import { desc, eq } from "drizzle-orm";
import {
  FileTextIcon,
  ImageIcon,
  MessageSquareIcon,
  MicIcon,
  SendIcon,
  SmartphoneIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import {
  inboxMessages,
  users,
  type INBOX_CHANNELS,
  type INBOX_CONTENT_TYPES,
  type INBOX_STATUSES,
} from "@/db/schema";
import { formatRelativeTimeIt } from "@/lib/format";
import { requireFamily } from "@/lib/session";
import { InboxUpload } from "./inbox-upload";

// A family sends a handful of messages a day; anything older than the last 50
// belongs to a history view nobody has asked for yet.
const MAX_MESSAGES = 50;

type Channel = (typeof INBOX_CHANNELS)[number];
type ContentType = (typeof INBOX_CONTENT_TYPES)[number];
type Status = (typeof INBOX_STATUSES)[number];

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  telegram: SendIcon,
  app: SmartphoneIcon,
};

const CONTENT_TYPE_ICONS: Record<ContentType, LucideIcon> = {
  voice: MicIcon,
  photo: ImageIcon,
  document: FileTextIcon,
  text: MessageSquareIcon,
};

const STATUS_BADGES: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  received: { label: "In elaborazione…", variant: "outline" },
  parsed: { label: "Da confermare", variant: "default" },
  confirmed: { label: "Salvato", variant: "secondary" },
  rejected: { label: "Annullato", variant: "outline" },
  failed: { label: "Non capito", variant: "destructive" },
};

type InboxRow = {
  id: string;
  channel: Channel;
  content_type: ContentType;
  status: Status;
  parse_result: string | null;
  parse_error: string | null;
  raw_text: string | null;
  created_at: string;
  senderName: string | null;
  senderEmail: string;
};

/**
 * What the card shows as the message's gist: the model's summary once it has
 * one, the error when it failed, and the raw text while it is still being
 * parsed.
 */
function messageSummary(row: InboxRow): string {
  if (row.parse_result) {
    try {
      const parsed = JSON.parse(row.parse_result) as { summary_it?: string };
      if (parsed.summary_it) return parsed.summary_it;
    } catch {
      // Fall through to the generic text below.
    }
  }
  if (row.status === "failed") {
    return "😓 Non sono riuscito ad analizzare questo messaggio.";
  }
  return row.raw_text ?? "Messaggio in elaborazione…";
}

function InboxCard({ row }: { row: InboxRow }) {
  const ChannelIcon = CHANNEL_ICONS[row.channel];
  const ContentIcon = CONTENT_TYPE_ICONS[row.content_type];
  const badge = STATUS_BADGES[row.status];

  return (
    <Card>
      <CardContent>
        <Link href={`/inbox/${row.id}`} className="flex items-start gap-3">
          <span className="text-muted-foreground flex shrink-0 items-center gap-1 pt-0.5">
            <ChannelIcon className="size-4" aria-hidden />
            <ContentIcon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm">{messageSummary(row)}</span>
            <span className="text-muted-foreground block text-xs">
              {row.senderName ?? row.senderEmail} · {formatRelativeTimeIt(row.created_at)}
            </span>
          </span>
          <Badge variant={badge.variant} className="shrink-0">
            {badge.label}
          </Badge>
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function InboxPage() {
  const { familyId } = await requireFamily();

  const rows = (await db
    .select({
      id: inboxMessages.id,
      channel: inboxMessages.channel,
      content_type: inboxMessages.content_type,
      status: inboxMessages.status,
      parse_result: inboxMessages.parse_result,
      parse_error: inboxMessages.parse_error,
      raw_text: inboxMessages.raw_text,
      created_at: inboxMessages.created_at,
      senderName: users.name,
      senderEmail: users.email,
    })
    .from(inboxMessages)
    .innerJoin(users, eq(inboxMessages.user_id, users.id))
    .where(eq(inboxMessages.family_id, familyId))
    .orderBy(desc(inboxMessages.created_at))
    .limit(MAX_MESSAGES)) as InboxRow[];

  const pending = rows.filter(
    (row) => row.status === "parsed" || row.status === "received",
  );
  const history = rows.filter(
    (row) => row.status !== "parsed" && row.status !== "received",
  );

  return (
    <div className="space-y-6 py-4">
      <h1 className="text-2xl font-semibold">Inbox</h1>

      <InboxUpload />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Da confermare</h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Niente in attesa. Mandami un vocale, una foto o un PDF 🙂
          </p>
        ) : (
          pending.map((row) => <InboxCard key={row.id} row={row} />)
        )}
      </section>

      {history.length > 0 ? (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm font-medium">
            Storico ({history.length})
          </summary>
          <div className="mt-2 space-y-2">
            {history.map((row) => (
              <InboxCard key={row.id} row={row} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
