/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Web push (spec 07 §1)
//
// `notifyUser` (src/lib/reminders/send.ts) sends a JSON payload of
// { title, body, url }; we surface it as a system notification and, on click,
// focus an existing app tab or open one at the target URL.
// ---------------------------------------------------------------------------

type PushPayload = { title: string; body: string; url: string };

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    // A push with no/invalid JSON body isn't ours — ignore it rather than
    // showing an empty notification.
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Reuse an already-open app tab when one is on the target URL…
      for (const client of windows) {
        if (client.url.endsWith(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // …otherwise open a fresh one.
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
