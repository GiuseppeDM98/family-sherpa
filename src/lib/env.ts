import { z } from "zod";

/**
 * Server-only environment variables. Never import this module from
 * client components — use `clientEnv` for anything the browser needs.
 */
const serverSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().optional(),
  ENCRYPTION_KEY: z.string().refine((value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  }, "ENCRYPTION_KEY must be a base64-encoded 32-byte key"),
  AUTH_SECRET: z.string().min(1),
  // Comma-separated allowlist gating who may *create* a new family. Unset = open instance.
  AUTH_ALLOWED_EMAILS: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(1),
});

function parseEnv() {
  const parsedServer = serverSchema.safeParse(process.env);
  const parsedClient = clientSchema.safeParse(process.env);

  if (!parsedServer.success || !parsedClient.success) {
    const issues = [
      ...(parsedServer.success ? [] : parsedServer.error.issues),
      ...(parsedClient.success ? [] : parsedClient.error.issues),
    ];
    const missing = issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Invalid or missing environment variables: ${missing}. Check .env.example.`,
    );
  }

  return { server: parsedServer.data, client: parsedClient.data };
}

const parsed = parseEnv();

export const env = parsed.server;
export const clientEnv = parsed.client;
