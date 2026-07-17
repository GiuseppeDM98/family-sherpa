import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_VARS = {
  TURSO_DATABASE_URL: "file:local.db",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  ENCRYPTION_KEY: "aoVBBVYd4h1kkuThTeS2I3F1TZDK9GUlXIsb9lWnkNI=",
  AUTH_SECRET: "test-auth-secret",
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
});
