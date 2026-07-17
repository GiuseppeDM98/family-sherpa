"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { familyMembers, families, users } from "@/db/schema";
import { isEmailAllowlisted } from "@/lib/auth-allowlist";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";

export async function createFamily(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsedName = z.string().trim().min(1).safeParse(name);
  if (!parsedName.success) {
    return { ok: false, error: "Inserisci un nome per la famiglia." };
  }

  const { userId } = await requireUser();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { ok: false, error: "Utente non trovato." };

  if (!isEmailAllowlisted(user.email, env.AUTH_ALLOWED_EMAILS)) {
    return {
      ok: false,
      error: "Solo alcuni indirizzi email possono creare una nuova famiglia su questa istanza.",
    };
  }

  const [family] = await db.insert(families).values({ name: parsedName.data }).returning();
  if (!family) return { ok: false, error: "Impossibile creare la famiglia." };

  await db.insert(familyMembers).values({
    family_id: family.id,
    user_id: userId,
    role: "admin",
  });

  return { ok: true };
}

export async function joinFamily(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, error: "Inserisci un codice invito." };
  }

  const { userId } = await requireUser();

  const [family] = await db
    .select()
    .from(families)
    .where(eq(families.invite_code, normalizedCode));
  if (!family) {
    return { ok: false, error: "Codice non valido." };
  }

  await db.insert(familyMembers).values({
    family_id: family.id,
    user_id: userId,
    role: "member",
  });

  return { ok: true };
}
