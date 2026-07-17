import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_VARS = {
  TURSO_DATABASE_URL: "file:local.db",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  ENCRYPTION_KEY: "aoVBBVYd4h1kkuThTeS2I3F1TZDK9GUlXIsb9lWnkNI=",
  AUTH_SECRET: "test-auth-secret",
  TELEGRAM_BOT_TOKEN: "test-bot-token",
  TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "FamilySherpaBot",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  GROQ_API_KEY: "test-groq-key",
};

describe("env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("parses successfully given all required variables", async () => {
    Object.assign(process.env, REQUIRED_VARS);
    const { env, clientEnv } = await import("./env");
    expect(env.TURSO_DATABASE_URL).toBe(REQUIRED_VARS.TURSO_DATABASE_URL);
    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe(REQUIRED_VARS.NEXT_PUBLIC_APP_URL);
  });

  it("throws a readable error when a required variable is missing", async () => {
    Object.assign(process.env, REQUIRED_VARS);
    delete process.env.TURSO_DATABASE_URL;
    await expect(import("./env")).rejects.toThrow(/TURSO_DATABASE_URL/);
  });

  it("defaults the LLM model and the STT provider", async () => {
    Object.assign(process.env, REQUIRED_VARS);
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.STT_PROVIDER;
    const { env } = await import("./env");
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5");
    expect(env.STT_PROVIDER).toBe("groq");
  });

  it("requires the API key of the selected STT provider", async () => {
    Object.assign(process.env, REQUIRED_VARS, { STT_PROVIDER: "openai" });
    await expect(import("./env")).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
