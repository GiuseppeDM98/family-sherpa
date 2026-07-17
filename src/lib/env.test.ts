import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

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
    Object.assign(process.env, TEST_ENV);
    const { env, clientEnv } = await import("./env");
    expect(env.TURSO_DATABASE_URL).toBe(TEST_ENV.TURSO_DATABASE_URL);
    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe(TEST_ENV.NEXT_PUBLIC_APP_URL);
  });

  it("throws a readable error when a required variable is missing", async () => {
    Object.assign(process.env, TEST_ENV);
    delete process.env.TURSO_DATABASE_URL;
    await expect(import("./env")).rejects.toThrow(/TURSO_DATABASE_URL/);
  });

  it("defaults the LLM model and the STT provider", async () => {
    Object.assign(process.env, TEST_ENV);
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.STT_PROVIDER;
    const { env } = await import("./env");
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5");
    expect(env.STT_PROVIDER).toBe("groq");
  });

  it("requires the API key of the selected STT provider", async () => {
    Object.assign(process.env, TEST_ENV, { STT_PROVIDER: "openai" });
    await expect(import("./env")).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
