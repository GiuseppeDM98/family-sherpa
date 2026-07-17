import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const VERSION = "v1";
const PREFIX = `enc:${VERSION}:`;

export class EncryptionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EncryptionError";
  }
}

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new EncryptionError(
      `ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`,
    );
  }
  return key;
}

/** Encrypts a plaintext string into "enc:v1:<iv_b64>:<ciphertext_b64>:<tag_b64>". */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Decrypts a value produced by `encryptField`. Throws `EncryptionError` for any other input. */
export function decryptField(value: string): string {
  if (!isEncrypted(value)) {
    throw new EncryptionError(
      'Value is not an encrypted field (expected "enc:v1:..." format)',
    );
  }

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3 || !parts[0] || !parts[2]) {
    // Ciphertext (parts[1]) may legitimately be an empty string (empty plaintext).
    throw new EncryptionError("Malformed encrypted value");
  }
  const [ivB64, ciphertextB64, tagB64] = [parts[0], parts[1] ?? "", parts[2]];

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch (cause) {
    throw new EncryptionError(
      "Failed to decrypt value: authentication tag mismatch or corrupted data",
      { cause },
    );
  }
}
