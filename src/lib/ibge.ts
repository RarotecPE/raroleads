export interface IbgeUf {
  id: number;
  sigla: string;
  nome: string;
}

export interface IbgeMunicipio {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: IbgeUf;
    };
  };
}

export interface IbgeMunicipioDetalhe {
  id: string;
  nome: string;
  uf: string;
  populacao: number | null;
}

const LOCALIDADES_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";
const SIDRA_BASE = "https://apisidra.ibge.gov.br/values";
const IBGE_REVALIDATE = 60 * 60 * 24 * 30;

async function ibgeJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: IBGE_REVALIDATE },
    headers: { accept: "application/json" },
  });

  if (!response.ok) throw new Error(`IBGE request failed: ${response.status}`);

  return response.json() as Promise<T>;
}

export async function getIbgeUfs() {
  const ufs = await ibgeJson<IbgeUf[]>(`${LOCALIDADES_BASE}/estados?orderBy=nome`);
  return ufs.map((uf) => ({ id: uf.id, sigla: uf.sigla, nome: uf.nome }));
}

export async function getIbgeMunicipiosByUf(uf: string) {
  const normalizedUf = uf.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedUf)) return [];

  const municipios = await ibgeJson<IbgeMunicipio[]>(
    `${LOCALIDADES_BASE}/estados/${normalizedUf}/municipios?orderBy=nome`,
  );
  return municipios.map((municipio) => ({ id: String(municipio.id), nome: municipio.nome }));
}

async function getPopulacaoEstimada(codigoIbge: string) {
  try {
    const rows = await ibgeJson<Record<string, string>[]>(
      `${SIDRA_BASE}/t/6579/n6/${encodeURIComponent(codigoIbge)}/v/9324/p/last?formato=json`,
    );
    const value = rows.find((row) => row.V && !["...", "-", "X"].includes(row.V))?.V;
    if (!value) return null;

    const numeric = Number.parseInt(value.replace(/\D/g, ""), 10);
    return Number.isNaN(numeric) ? null : numeric;
  } catch {
    return null;
  }
}

export async function getIbgeMunicipioDetalhe(codigoIbge: string): Promise<IbgeMunicipioDetalhe | null> {
  const normalizedCodigo = codigoIbge.trim();
  if (!/^\d{7}$/.test(normalizedCodigo)) return null;

  const municipio = await ibgeJson<IbgeMunicipio>(`${LOCALIDADES_BASE}/municipios/${normalizedCodigo}`);
  const uf = municipio.microrregiao?.mesorregiao?.UF?.sigla;

  return {
    id: String(municipio.id),
    nome: municipio.nome,
    uf: uf ?? "",
    populacao: await getPopulacaoEstimada(normalizedCodigo),
  };
}
