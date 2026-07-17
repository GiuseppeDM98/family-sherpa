import { describe, expect, it } from "vitest";
import { generateLinkCode, isLinkCodeUsable, linkCodeExpiryIso, LINK_CODE_TTL_MINUTES } from "./link-code";

describe("generateLinkCode", () => {
  it("generates a 6-digit zero-padded numeric code", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateLinkCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("linkCodeExpiryIso", () => {
  it("expires LINK_CODE_TTL_MINUTES after the given instant", () => {
    const now = new Date("2026-07-17T10:00:00.000Z");
    const expiry = linkCodeExpiryIso(now);
    expect(expiry).toBe(new Date(now.getTime() + LINK_CODE_TTL_MINUTES * 60_000).toISOString());
  });
});

describe("isLinkCodeUsable", () => {
  const now = new Date("2026-07-17T10:00:00.000Z");

  it("accepts an unused, unexpired code", () => {
    const result = isLinkCodeUsable(
      { used: false, expires_at: new Date(now.getTime() + 60_000).toISOString() },
      now,
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects an already-used code", () => {
    const result = isLinkCodeUsable(
      { used: true, expires_at: new Date(now.getTime() + 60_000).toISOString() },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/già stato usato/);
  });

  it("rejects an expired code", () => {
    const result = isLinkCodeUsable(
      { used: false, expires_at: new Date(now.getTime() - 1_000).toISOString() },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/scaduto/);
  });

  it("treats a code expiring at exactly `now` as expired", () => {
    const result = isLinkCodeUsable({ used: false, expires_at: now.toISOString() }, now);
    expect(result.ok).toBe(false);
  });
});
