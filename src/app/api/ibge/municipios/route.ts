import { getIbgeMunicipiosByUf } from "@/lib/ibge";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const uf = url.searchParams.get("uf") ?? "";

  try {
    return Response.json({ ok: true, data: await getIbgeMunicipiosByUf(uf) });
  } catch {
    return Response.json({ ok: false, data: [], error: "Nao foi possivel consultar os municipios no IBGE." }, { status: 502 });
  }
}
