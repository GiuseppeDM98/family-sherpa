import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { familyMembers, families, telegramLinks, users } from "@/db/schema";
import { clientEnv } from "@/lib/env";
import { requireFamily } from "@/lib/session";
import { signOutAction } from "./actions";
import { InviteCode } from "./invite-code";
import { TelegramLinkCard } from "./telegram-link-card";

export default async function SettingsPage() {
  const { familyId, userId } = await requireFamily();

  const [family] = await db.select().from(families).where(eq(families.id, familyId));
  if (!family) throw new Error(`Family ${familyId} not found`);

  const [telegramLink] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.user_id, userId));

  const members = await db
    .select({
      id: familyMembers.id,
      role: familyMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(familyMembers)
    .innerJoin(users, eq(familyMembers.user_id, users.id))
    .where(eq(familyMembers.family_id, familyId));

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>

      <Card>
        <CardHeader>
          <CardTitle>{family.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Condividi questo codice con i familiari
          </p>
          <InviteCode code={family.invite_code} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membri</CardTitle>
        </CardHeader>
        <CardContent className="divide-border divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{member.name ?? member.email}</p>
                <p className="text-muted-foreground text-sm">{member.email}</p>
              </div>
              <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                {member.role === "admin" ? "Admin" : "Membro"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collega Telegram</CardTitle>
        </CardHeader>
        <CardContent>
          <TelegramLinkCard
            botUsername={clientEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}
            link={telegramLink ? { username: telegramLink.telegram_username } : null}
          />
        </CardContent>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Esci
        </Button>
      </form>
    </div>
  );
}
