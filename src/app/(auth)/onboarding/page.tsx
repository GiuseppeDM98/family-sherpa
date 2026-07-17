import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { familyMembers } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { CreateFamilyForm, JoinFamilyForm } from "./onboarding-forms";

export default async function OnboardingPage() {
  const { userId } = await requireUser();

  const [membership] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, userId));
  if (membership) redirect("/");

  return (
    <div className="space-y-4">
      <CreateFamilyForm />
      <JoinFamilyForm />
    </div>
  );
}
