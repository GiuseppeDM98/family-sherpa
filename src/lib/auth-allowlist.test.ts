import { describe, expect, it } from "vitest";
import { isEmailAllowedToCreateFamily } from "./auth-allowlist";

describe("isEmailAllowedToCreateFamily", () => {
  it("allows any email when the allowlist is undefined (open instance)", () => {
    expect(isEmailAllowedToCreateFamily("anyone@example.com", undefined)).toBe(true);
  });

  it("allows any email when the allowlist is an empty string", () => {
    expect(isEmailAllowedToCreateFamily("anyone@example.com", "")).toBe(true);
  });

  it("allows an email present in the comma-separated allowlist", () => {
    expect(
      isEmailAllowedToCreateFamily("me@example.com", "me@example.com,partner@example.com"),
    ).toBe(true);
  });

  it("rejects an email absent from the allowlist", () => {
    expect(
      isEmailAllowedToCreateFamily("stranger@example.com", "me@example.com,partner@example.com"),
    ).toBe(false);
  });

  it("is case-insensitive and trims whitespace around entries", () => {
    expect(
      isEmailAllowedToCreateFamily("Me@Example.com", " me@example.com , partner@example.com "),
    ).toBe(true);
  });
});
