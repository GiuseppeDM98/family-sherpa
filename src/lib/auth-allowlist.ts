/**
 * `AUTH_ALLOWED_EMAILS` gates who may *create* a new family, never who may
 * join one via invite code (see docs/specs/03-auth-and-families.md §5).
 * Unset/empty env var means an open instance — everyone is allowed.
 *
 * Takes `allowedEmails` explicitly (rather than reading `env` itself) so
 * this pure logic can be unit-tested without loading `src/lib/env.ts`.
 */
export function isEmailAllowedToCreateFamily(
  email: string,
  allowedEmails: string | undefined,
): boolean {
  if (!allowedEmails || allowedEmails.trim() === "") return true;

  const allowlist = allowedEmails
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return allowlist.includes(email.trim().toLowerCase());
}
