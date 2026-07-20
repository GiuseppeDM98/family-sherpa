import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Fresh-family empty state: no charts, point at the bot/inbox instead. */
export function OnboardingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ancora nessuna spesa registrata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Inoltra un vocale, una foto o un PDF al bot Telegram — bollette, bolli, scadenze — e
          comincerò a costruire qui il quadro delle tue finanze familiari.
        </p>
        <p className="text-muted-foreground">
          Oppure aggiungi a mano la prima scadenza o il primo asset per iniziare.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/inbox" className="text-primary text-sm font-medium hover:underline">
            Vai all&apos;inbox →
          </Link>
          <Link href="/assets" className="text-primary text-sm font-medium hover:underline">
            Aggiungi un asset →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
