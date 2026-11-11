import { disconnectStrava, stravaAccess } from "@/lib/health/strava-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await stravaAccess(request);
  if (!access) return Response.json({ error: "Sign in to disconnect Strava." }, { status: 401 });
  if (request.headers.get("origin") !== access.origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    await disconnectStrava(access);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Strava disconnect failed." }, { status: 502 });
  }
}
