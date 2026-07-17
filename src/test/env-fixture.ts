/**
 * A complete, valid set of environment variables for tests.
 *
 * `src/lib/env.ts` validates the whole environment on import, so any test that
 * (even transitively) imports a module reading `env` needs all of them set —
 * not just the ones it cares about. Keeping the set here means adding an env
 * var doesn't silently break unrelated test files.
 */
export const TEST_ENV = {
  TURSO_DATABASE_URL: "file:local.db",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  ENCRYPTION_KEY: "aoVBBVYd4h1kkuThTeS2I3F1TZDK9GUlXIsb9lWnkNI=",
  AUTH_SECRET: "test-auth-secret",
  TELEGRAM_BOT_TOKEN: "test-bot-token",
  TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "FamilySherpaBot",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  GROQ_API_KEY: "test-groq-key",
} as const;
