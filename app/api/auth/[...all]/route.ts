import { getAccountServices } from "@/lib/account/server";

export const runtime = "nodejs";

async function handler(request: Request) {
  const services = await getAccountServices();
  if (!services) return Response.json({ error: "Accounts are disabled." }, { status: 503 });
  return services.auth.handler(request);
}

export { handler as GET, handler as POST };
