import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

async function loadCrypto() {
  vi.resetModules();
  process.env = { ...process.env, ...TEST_ENV };
  return import("./crypto");
}

describe("crypto", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a plaintext string", async () => {
    const { encryptField, decryptField } = await loadCrypto();
    const encrypted = encryptField("codice fiscale segreto");
    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    expect(decryptField(encrypted)).toBe("codice fiscale segreto");
  });

  it("round-trips an empty string", async () => {
    const { encryptField, decryptField } = await loadCrypto();
    const encrypted = encryptField("");
    expect(decryptField(encrypted)).toBe("");
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptField } = await loadCrypto();
    expect(encryptField("stessa frase")).not.toBe(encryptField("stessa frase"));
  });

  it("throws EncryptionError when the ciphertext is tampered with", async () => {
    const { encryptField, decryptField, EncryptionError } = await loadCrypto();
    const encrypted = encryptField("dato sensibile");
    const [prefix, version, iv, ciphertext, tag] = encrypted.split(":");
    const tamperedCiphertext = ciphertext === "AA" ? "AB" : "AA";
    const tampered = [prefix, version, iv, tamperedCiphertext, tag].join(":");
    expect(() => decryptField(tampered)).toThrow(EncryptionError);
  });

  it("throws EncryptionError for input not in the enc:v1:... format", async () => {
    const { decryptField, EncryptionError } = await loadCrypto();
    expect(() => decryptField("just a plain string")).toThrow(EncryptionError);
  });

  it("isEncrypted only recognizes the enc:v1:... format", async () => {
    const { encryptField, isEncrypted } = await loadCrypto();
    expect(isEncrypted(encryptField("x"))).toBe(true);
    expect(isEncrypted("plain text")).toBe(false);
  });
});
