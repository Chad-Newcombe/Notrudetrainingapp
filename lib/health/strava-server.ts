import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getAccountServices } from "@/lib/account/server";
import {
  isStravaStateValid,
  shouldRefreshStravaToken,
  stravaAuthorizationUrl,
  summarizeStravaActivities,
  type StravaActivity,
} from "@/lib/health/strava";

const STRAVA = "strava";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().positive(),
  scope: z.string().default("activity:read_all"),
});

const activitiesSchema = z.array(z.object({
  id: z.number(),
  name: z.string(),
  moving_time: z.number().nonnegative(),
  start_date: z.string(),
  type: z.string(),
}));

type Access = Awaited<NonNullable<ReturnType<typeof getAccountServices>>> & { userId: string };

export function stravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export async function stravaAccess(request: Request): Promise<Access | null> {
  const services = await getAccountServices();
  if (!services) return null;
  const session = await services.auth.api.getSession({ headers: request.headers });
  return session ? { ...services, userId: session.user.id } : null;
}

export function healthRedirect(origin: string, result: string): string {
  const url = new URL("/progress", origin);
  url.searchParams.set("health", result);
  return url.toString();
}

export async function beginStravaAuthorization(access: Access): Promise<string> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId || !process.env.STRAVA_CLIENT_SECRET) throw new Error("Strava is not configured.");
  const state = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 10 * 60 * 1000;
  access.db.prepare("DELETE FROM health_oauth_state WHERE expires_at <= ?").run(Date.now());
  access.db.prepare(`
    INSERT INTO health_oauth_state (state, user_id, provider, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(state, access.userId, STRAVA, expiresAt);
  return stravaAuthorizationUrl({
    clientId,
    redirectUri: new URL("/api/health/strava/callback", access.origin).toString(),
    state,
  });
}

export function consumeStravaState(access: Access, state: string): boolean {
  const row = access.db.prepare(`
    SELECT expires_at FROM health_oauth_state
    WHERE state = ? AND user_id = ? AND provider = ?
  `).get(state, access.userId, STRAVA) as { expires_at: number } | undefined;
  access.db.prepare("DELETE FROM health_oauth_state WHERE state = ?").run(state);
  return Boolean(row && isStravaStateValid(Number(row.expires_at)));
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Strava token exchange failed.");
  return tokenResponseSchema.parse(await response.json());
}

function saveToken(access: Access, token: z.infer<typeof tokenResponseSchema>) {
  access.db.prepare(`
    INSERT INTO health_oauth_token
      (user_id, provider, access_token, refresh_token, expires_at, scope)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      scope = excluded.scope
  `).run(access.userId, STRAVA, token.access_token, token.refresh_token, token.expires_at, token.scope);
}

export async function exchangeStravaCode(access: Access, code: string) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Strava is not configured.");
  const token = await tokenRequest(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  }));
  saveToken(access, token);
}

type StoredToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
};

async function activeToken(access: Access): Promise<StoredToken | null> {
  let token = access.db.prepare(`
    SELECT access_token, refresh_token, expires_at, scope
    FROM health_oauth_token WHERE user_id = ? AND provider = ?
  `).get(access.userId, STRAVA) as StoredToken | undefined;
  if (!token) return null;
  if (shouldRefreshStravaToken(Number(token.expires_at))) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Strava is not configured.");
    const refreshed = await tokenRequest(new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }));
    saveToken(access, refreshed);
    token = refreshed;
  }
  return token;
}

async function recentActivities(accessToken: string): Promise<StravaActivity[]> {
  const url = new URL("https://www.strava.com/api/v3/athlete/activities");
  url.searchParams.set("per_page", "10");
  url.searchParams.set("page", "1");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Strava activity sync failed.");
  return activitiesSchema.parse(await response.json());
}

function saveConnection(access: Access, connected: boolean, summary?: string) {
  const value = connected ? {
    provider: STRAVA,
    connected: true,
    lastSyncedAt: new Date().toISOString(),
    sampleSummary: summary,
  } : { provider: STRAVA, connected: false };
  access.db.prepare(`
    INSERT INTO coaching_record (user_id, collection, record_key, payload)
    VALUES (?, 'health', ?, ?)
    ON CONFLICT(user_id, collection, record_key) DO UPDATE SET payload = excluded.payload
  `).run(access.userId, STRAVA, JSON.stringify(value));
}

export async function syncStrava(access: Access): Promise<string> {
  const token = await activeToken(access);
  if (!token) throw new Error("Strava is not connected.");
  const activities = await recentActivities(token.access_token);
  const summary = summarizeStravaActivities(activities);
  saveConnection(access, true, summary);
  return summary;
}

export function stravaConnected(access: Access): boolean {
  return Boolean(access.db.prepare(
    "SELECT 1 FROM health_oauth_token WHERE user_id = ? AND provider = ?",
  ).get(access.userId, STRAVA));
}

export async function disconnectStrava(access: Access): Promise<void> {
  const token = access.db.prepare(`
    SELECT refresh_token FROM health_oauth_token WHERE user_id = ? AND provider = ?
  `).get(access.userId, STRAVA) as { refresh_token: string } | undefined;
  if (token) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Strava is not configured.");
    const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://www.strava.com/oauth/revoke", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: token.refresh_token, token_type_hint: "refresh_token" }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Strava disconnect failed.");
  }
  access.db.prepare("DELETE FROM health_oauth_token WHERE user_id = ? AND provider = ?")
    .run(access.userId, STRAVA);
  saveConnection(access, false);
}
