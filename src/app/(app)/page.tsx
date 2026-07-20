import { EmptyStatePage } from "@/components/empty-state-page";
import { PushPermission } from "@/components/push-permission";
import { clientEnv } from "@/lib/env";
import { requireFamily } from "@/lib/session";

export default async function HomePage() {
  // The dashboard is spec 08; for now Home carries the soft push-opt-in banner
  // (spec 07 §1), which self-hides once notifications are enabled on the device.
  await requireFamily();

  return (
    <div className="space-y-4 py-4">
      <PushPermission vapidPublicKey={clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY} variant="banner" />
      <EmptyStatePage title="Home" />
    </div>
  );
}
