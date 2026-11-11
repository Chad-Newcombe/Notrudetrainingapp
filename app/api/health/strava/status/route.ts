import { stravaAccess, stravaConfigured, stravaConnected } from "@/lib/health/strava-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await stravaAccess(request);
  return Response.json({
    configured: stravaConfigured(),
    signedIn: Boolean(access),
    connected: access ? stravaConnected(access) : false,
  }, { headers: { "Cache-Control": "no-store" } });
}
