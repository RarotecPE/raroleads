import { checkDatabaseHealth } from "@/db/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkDatabaseHealth();
  return Response.json(health, { status: health.ok ? 200 : 500 });
}
