import { getIbgeMunicipioDetalhe } from "@/lib/ibge";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = await getIbgeMunicipioDetalhe(id);
    if (!data) return Response.json({ ok: false, error: "Municipio invalido." }, { status: 400 });
    return Response.json({ ok: true, data });
  } catch {
    return Response.json({ ok: false, error: "Nao foi possivel consultar o municipio no IBGE." }, { status: 502 });
  }
}
