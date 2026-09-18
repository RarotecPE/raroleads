import { MODULE_CATALOG } from "@/lib/constants";
import { norm } from "@/lib/utils";

export type Oportunidade<TCliente extends { id: string }> = {
  municipio: TCliente;
  missing: string[];
};

export function computeOportunidades<
  TCliente extends { id: string },
  TBase extends { id: string; municipioId: string },
  TModulo extends { baseId: string; nome: string },
>(
  clientes: TCliente[],
  bases: TBase[],
  modulos: TModulo[],
): Oportunidade<TCliente>[] {
  const clienteByBase = new Map(bases.map((base) => [base.id, base.municipioId]));
  const ownedByClient = new Map<string, Set<string>>();
  for (const modulo of modulos) {
    const clienteId = clienteByBase.get(modulo.baseId);
    if (!clienteId) continue;
    const owned = ownedByClient.get(clienteId) ?? new Set<string>();
    owned.add(norm(modulo.nome.trim()));
    ownedByClient.set(clienteId, owned);
  }

  return clientes
    .map((municipio) => ({
      municipio,
      missing: MODULE_CATALOG.filter((item) => !ownedByClient.get(municipio.id)?.has(norm(item.trim()))),
    }))
    .filter((opportunity) => opportunity.missing.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length || a.municipio.id.localeCompare(b.municipio.id));
}
