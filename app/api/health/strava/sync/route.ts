import { stravaAccess, syncStrava } from "@/lib/health/strava-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await stravaAccess(request);
  if (!access) return Response.json({ error: "Sign in to sync Strava." }, { status: 401 });
  if (request.headers.get("origin") !== access.origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    return Response.json({ summary: await syncStrava(access) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Strava sync failed." }, { status: 502 });
  }
}
