/**
 * `AUTH_ALLOWED_EMAILS` gates who may create an account (sign-up) and who
 * may create a new family, but never who may join one via invite code —
 * joining requires an account first, so on a fully closed instance every
 * invitee's email must also be added to the allowlist before they can sign
 * up and use their code.
 * Unset/empty env var means an open instance — everyone is allowed.
 *
 * Takes `allowedEmails` explicitly (rather than reading `env` itself) so
 * this pure logic can be unit-tested without loading `src/lib/env.ts`.
 */
export function isEmailAllowlisted(
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
