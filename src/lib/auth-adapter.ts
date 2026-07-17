import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";

/**
 * Hand-rolled Auth.js adapter for the users/accounts tables from spec 02.
 *
 * `@auth/drizzle-adapter` forwards Auth.js's own field names (`emailVerified`,
 * `userId`, `providerAccountId`) straight into `.values()`/`.set()`, which
 * only works if the Drizzle schema's JS property names match those exactly.
 * Spec 02 fixed our schema to snake_case (`email_verified`, `user_id`,
 * `provider_account_id`) to keep DB columns and row-object keys consistent
 * with the rest of the app, so we map between the two naming conventions
 * here instead. We also have no `sessions`/`verificationToken` tables (JWT
 * session strategy, no Email provider) — only the methods Auth.js actually
 * calls under that configuration are implemented.
 */
function toAdapterUser(user: typeof users.$inferSelect): AdapterUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.email_verified,
    image: user.image,
  };
}

export function DrizzleAuthAdapter(): Adapter {
  return {
    async createUser(user) {
      const [row] = await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified,
          image: user.image,
        })
        .returning();
      if (!row) throw new Error("Failed to create user");
      return toAdapterUser(row);
    },

    async getUser(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      return row ? toAdapterUser(row) : null;
    },

    async getUserByEmail(email) {
      const [row] = await db.select().from(users).where(eq(users.email, email));
      return row ? toAdapterUser(row) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const [row] = await db
        .select({ user: users })
        .from(accounts)
        .innerJoin(users, eq(accounts.user_id, users.id))
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.provider_account_id, providerAccountId),
          ),
        );
      return row ? toAdapterUser(row.user) : null;
    },

    async updateUser(user) {
      const [row] = await db
        .update(users)
        .set({
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified,
          image: user.image,
        })
        .where(eq(users.id, user.id))
        .returning();
      if (!row) throw new Error("User not found");
      return toAdapterUser(row);
    },

    async linkAccount(account: AdapterAccount) {
      await db.insert(accounts).values({
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state:
          typeof account.session_state === "string" ? account.session_state : null,
      });
    },
  };
}
