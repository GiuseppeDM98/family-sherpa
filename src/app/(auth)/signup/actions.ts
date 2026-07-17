"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isEmailAllowlisted } from "@/lib/auth-allowlist";
import { env } from "@/lib/env";

const registerSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono.",
    path: ["confirmPassword"],
  });

export async function registerWithPassword(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  if (!isEmailAllowlisted(parsed.data.email, env.AUTH_ALLOWED_EMAILS)) {
    return {
      ok: false,
      error: "Questa istanza non è aperta a nuove registrazioni. Chiedi un invito a chi la gestisce.",
    };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email));
  if (existing) {
    return { ok: false, error: "Email già registrata. Accedi invece." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    password_hash: passwordHash,
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });

  return { ok: true };
}
