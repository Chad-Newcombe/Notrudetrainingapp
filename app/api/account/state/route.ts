import { getAccountServices } from "@/lib/account/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const services = await getAccountServices();
  const session = await services?.auth.api.getSession({ headers: request.headers });
  return Response.json(
    {
      enabled: Boolean(services),
      user: session ? { id: session.user.id, name: session.user.name, email: session.user.email } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
