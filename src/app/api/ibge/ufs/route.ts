import { getIbgeUfs } from "@/lib/ibge";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ ok: true, data: await getIbgeUfs() });
  } catch {
    return Response.json({ ok: false, data: [], error: "Nao foi possivel consultar as UFs no IBGE." }, { status: 502 });
  }
}
