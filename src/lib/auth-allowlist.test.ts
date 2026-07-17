import { describe, expect, it } from "vitest";
import { isEmailAllowlisted } from "./auth-allowlist";

describe("isEmailAllowlisted", () => {
  it("allows any email when the allowlist is undefined (open instance)", () => {
    expect(isEmailAllowlisted("anyone@example.com", undefined)).toBe(true);
  });

  it("allows any email when the allowlist is an empty string", () => {
    expect(isEmailAllowlisted("anyone@example.com", "")).toBe(true);
  });

  it("allows an email present in the comma-separated allowlist", () => {
    expect(
      isEmailAllowlisted("me@example.com", "me@example.com,partner@example.com"),
    ).toBe(true);
  });

  it("rejects an email absent from the allowlist", () => {
    expect(
      isEmailAllowlisted("stranger@example.com", "me@example.com,partner@example.com"),
    ).toBe(false);
  });

  it("is case-insensitive and trims whitespace around entries", () => {
    expect(
      isEmailAllowlisted("Me@Example.com", " me@example.com , partner@example.com "),
    ).toBe(true);
  });
});
