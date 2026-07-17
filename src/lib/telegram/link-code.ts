import { randomInt } from "node:crypto";

export const LINK_CODE_TTL_MINUTES = 10;

/** 6-digit numeric code, zero-padded (e.g. "004821"). */
export function generateLinkCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function linkCodeExpiryIso(now: Date = new Date()): string {
  return new Date(now.getTime() + LINK_CODE_TTL_MINUTES * 60_000).toISOString();
}

type LinkCodeUsability = { used: boolean; expires_at: string };

/**
 * Checks a `telegram_link_codes` row that has already been found by its
 * code — the "code not found" case is handled by the caller, since that
 * requires a DB lookup this pure function can't perform.
 */
export function isLinkCodeUsable(
  linkCode: LinkCodeUsability,
  now: Date = new Date(),
): { ok: true } | { ok: false; error: string } {
  if (linkCode.used) {
    return {
      ok: false,
      error: "❌ Questo codice è già stato usato. Generane uno nuovo dalle Impostazioni dell'app.",
    };
  }
  if (new Date(linkCode.expires_at).getTime() <= now.getTime()) {
    return {
      ok: false,
      error: "❌ Codice scaduto. Generane uno nuovo dalle Impostazioni dell'app.",
    };
  }
  return { ok: true };
}
