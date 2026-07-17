import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { familyMembers } from "@/db/schema";

/**
 * Canonical scoping helpers — every server action and page in the (app)
 * route group must start with one of these (see docs/specs/03 §4). Never
 * query domain tables without going through `requireFamily()` first: a
 * missing family scope is a security bug (multi-tenancy, spec 00 §6).
 */

export async function requireUser(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return { userId: session.user.id };
}

export async function requireFamily(): Promise<{
  userId: string;
  familyId: string;
  role: "admin" | "member";
}> {
  const { userId } = await requireUser();

  const [membership] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.user_id, userId));

  if (!membership) redirect("/onboarding");

  return { userId, familyId: membership.family_id, role: membership.role };
}
