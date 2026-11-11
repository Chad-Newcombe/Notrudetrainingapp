import { consumeStravaState, exchangeStravaCode, healthRedirect, stravaAccess, syncStrava } from "@/lib/health/strava-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const access = await stravaAccess(request);
  if (!access) return Response.redirect(new URL("/account?health=strava", url.origin));
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (url.searchParams.get("error") || !state || !code || !consumeStravaState(access, state)) {
    return Response.redirect(healthRedirect(url.origin, "strava-denied"));
  }
  try {
    await exchangeStravaCode(access, code);
    await syncStrava(access);
    return Response.redirect(healthRedirect(url.origin, "strava-connected"));
  } catch {
    return Response.redirect(healthRedirect(url.origin, "strava-error"));
  }
}
