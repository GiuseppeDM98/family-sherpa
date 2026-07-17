/**
 * Registers the Telegram webhook and bot commands for this deployment.
 *
 * Run with: pnpm telegram:setup
 *
 * Local development needs a public HTTPS tunnel first — Telegram cannot call
 * localhost. Start one with `cloudflared tunnel --url http://localhost:3000`,
 * set NEXT_PUBLIC_APP_URL in .env to the printed https URL, then run this
 * script. Re-run it again whenever the tunnel URL changes (the no-account
 * "quick tunnel" issues a new one on every restart).
 */
import { Api } from "grammy";
import { clientEnv, env } from "@/lib/env";

async function main() {
  const api = new Api(env.TELEGRAM_BOT_TOKEN);
  const webhookUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;

  console.log(`Setting webhook to ${webhookUrl}`);
  await api.setWebhook(webhookUrl, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  });

  console.log("Setting bot commands…");
  await api.setMyCommands([
    { command: "start", description: "Avvia il bot" },
    { command: "collega", description: "Collega questa chat al tuo account" },
    { command: "aiuto", description: "Guida rapida" },
  ]);

  const info = await api.getWebhookInfo();
  console.log("Webhook info:");
  console.log(JSON.stringify(info, null, 2));
}

main().catch((error: unknown) => {
  console.error("telegram-setup failed:", error);
  process.exit(1);
});
