import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { Pool } from "pg";
import { GOOGLE_IOS_CLIENT_ID, IOS_BUNDLE_ID } from "@/lib/account/providers";

/** What the account routes need from the database: pg's Pool, or anything with the same two calls (tests). */
export type AccountDb = Pick<Pool, "query" | "connect">;

/** Google turns on once both values are on the server; Apple is native-only, so it needs no secret. */
export function googleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // The first client ID runs the web redirect; the iOS one is accepted for tokens from the app.
  return clientId && clientSecret ? { google: { clientId: [clientId, GOOGLE_IOS_CLIENT_ID], clientSecret } } : {};
}

// shortcut: Apple works from the iOS app only (ID token, audience = bundle ID); web Apple sign-in
// needs a Services ID and a signed client secret, add those if Apple is wanted on the website.
const appleProvider = { apple: { clientId: IOS_BUNDLE_ID, clientSecret: "", appBundleIdentifier: IOS_BUNDLE_ID } };

async function prepare(secret: string, url: string, connectionString: string) {
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  const db = new Pool({ connectionString, max: 3, ssl: local ? undefined : { rejectUnauthorized: false } });
  const origin = new URL(url).origin;
  const options = {
    appName: "Notrude",
    baseURL: origin,
    secret,
    database: db,
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    socialProviders: { ...googleProvider(), ...appleProvider },
    rateLimit: { enabled: true, storage: "database" },
  } satisfies BetterAuthOptions;
  try {
    const migrations = await getMigrations(options);
    await migrations.runMigrations();
    await db.query(`
    CREATE TABLE IF NOT EXISTS coaching_record (
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      collection TEXT NOT NULL,
      record_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (user_id, collection, record_key)
    );
    CREATE TABLE IF NOT EXISTS health_oauth_state (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      expires_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS health_oauth_token (
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      scope TEXT NOT NULL,
      PRIMARY KEY (user_id, provider)
    )
    `);
    return { auth: betterAuth(options), db: db as AccountDb, origin };
  } catch (error) {
    await db.end();
    throw error;
  }
}

const runtime = globalThis as typeof globalThis & {
  notrudeAccountServices?: ReturnType<typeof prepare>;
};

/** Accounts are on when the server has an auth secret, its public URL and a Postgres DATABASE_URL (Supabase). */
export function getAccountServices() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const url = process.env.BETTER_AUTH_URL;
  const database = process.env.DATABASE_URL;
  if (!secret || !url || !database) return null;

  runtime.notrudeAccountServices ??= prepare(secret, url, database).catch((error) => {
    delete runtime.notrudeAccountServices;
    throw error;
  });
  return runtime.notrudeAccountServices;
}
