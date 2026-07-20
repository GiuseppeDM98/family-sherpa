"use client";

import { BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Web-push opt-in.
 *
 * Rendered on Settings as a `card` and on Home as a `banner`. It requests
 * `Notification` permission, subscribes via `pushManager`, and POSTs the
 * subscription to `/api/push/subscribe`. iOS only exposes the push APIs to an
 * *installed* PWA, so on an iPhone Safari tab we show the install hint instead
 * of a dead button.
 */

/** Decodes the URL-safe base64 VAPID key into the byte array `subscribe` needs. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Back the array with a concrete ArrayBuffer (not the ArrayBufferLike default)
  // so it satisfies applicationServerKey's BufferSource type.
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type SupportState = "loading" | "unsupported" | "ios-needs-install" | "ready";

const IOS_INSTALL_HINT =
  "Su iPhone: installa prima l'app (Condividi → Aggiungi a Home), poi attiva le notifiche da qui.";

export function PushPermission({
  vapidPublicKey,
  variant = "card",
}: {
  vapidPublicKey: string;
  variant?: "card" | "banner";
}) {
  const router = useRouter();
  const [support, setSupport] = useState<SupportState>("loading");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Detect capability and current subscription state on mount. Runs only in the
  // browser, so the push/Notification globals are safe to touch here.
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const supportsPush =
        "Notification" in window &&
        "PushManager" in window &&
        "serviceWorker" in navigator;

      if (!supportsPush) {
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        if (!cancelled) setSupport(isIOS ? "ios-needs-install" : "unsupported");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (cancelled) return;

      setPermission(Notification.permission);
      setIsSubscribed(subscription !== null);
      setSupport("ready");
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      try {
        const granted = await Notification.requestPermission();
        setPermission(granted);
        if (granted !== "granted") {
          setError("Permesso per le notifiche non concesso.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error(`subscribe request failed: ${response.status}`);

        setIsSubscribed(true);
        router.refresh(); // Reveal the new device in the Settings list.
      } catch (cause) {
        console.error("[push-permission] subscribe failed", cause);
        setError("Impossibile attivare le notifiche. Riprova.");
      }
    });
  }

  // The banner (Home) is a nudge: it stays silent whenever there's nothing to
  // prompt — already on, blocked, or unsupported on a non-iOS browser.
  const isBanner = variant === "banner";

  if (support === "loading") return null;

  if (support === "unsupported") {
    if (isBanner) return null;
    return (
      <p className="text-muted-foreground text-sm">
        Questo browser non supporta le notifiche push.
      </p>
    );
  }

  if (support === "ios-needs-install") {
    return <p className="text-muted-foreground text-sm">{IOS_INSTALL_HINT}</p>;
  }

  if (permission === "granted" && isSubscribed) {
    if (isBanner) return null;
    return <p className="text-sm">Notifiche attive su questo dispositivo ✅</p>;
  }

  if (permission === "denied") {
    if (isBanner) return null;
    return (
      <p className="text-muted-foreground text-sm">
        Notifiche bloccate. Riattivale dalle impostazioni del browser per questo sito.
      </p>
    );
  }

  const button = (
    <Button type="button" onClick={handleSubscribe} disabled={isPending}>
      <BellIcon />
      {isPending ? "Attivazione…" : "Attiva le notifiche"}
    </Button>
  );

  if (isBanner) {
    return (
      <div className="border-border bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Attiva i promemoria</p>
        <p className="text-muted-foreground text-sm">
          Ricevi un avviso quando una scadenza si avvicina o è ora di una medicina.
        </p>
        {button}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {button}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
