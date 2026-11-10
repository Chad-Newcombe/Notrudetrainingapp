import "server-only";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

async function prepare(secret: string, url: string) {
  const filename = resolve(process.env.NOTRUDE_DB_PATH || ".notrude/notrude.sqlite");
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  closeSync(openSync(filename, "a", 0o600));
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const origin = new URL(url).origin;
  const options = {
    appName: "Notrude",
    baseURL: origin,
    secret,
    database: db,
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    rateLimit: { enabled: true, storage: "database" },
  } satisfies BetterAuthOptions;
  try {
    const migrations = await getMigrations(options);
    await migrations.runMigrations();
    db.exec(`
    CREATE TABLE IF NOT EXISTS coaching_record (
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      collection TEXT NOT NULL,
      record_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (user_id, collection, record_key)
    )
    `);
    return { auth: betterAuth(options), db, origin };
  } catch (error) {
    db.close();
    throw error;
  }
}

const runtime = globalThis as typeof globalThis & {
  notrudeAccountServices?: ReturnType<typeof prepare>;
};

export function getAccountServices() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const url = process.env.BETTER_AUTH_URL;
  if (!secret || !url) return null;

  runtime.notrudeAccountServices ??= prepare(secret, url).catch((error) => {
    delete runtime.notrudeAccountServices;
    throw error;
  });
  return runtime.notrudeAccountServices;
}
