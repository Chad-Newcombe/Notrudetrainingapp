import { beginStravaAuthorization, healthRedirect, stravaAccess, stravaConfigured } from "@/lib/health/strava-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!stravaConfigured()) return Response.redirect(healthRedirect(origin, "strava-unavailable"));
  const access = await stravaAccess(request);
  if (!access) return Response.redirect(new URL("/account?health=strava", origin));
  return Response.redirect(await beginStravaAuthorization(access));
}
