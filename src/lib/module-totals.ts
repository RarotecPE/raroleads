import { MODULE_CATALOG } from "@/lib/constants";
import { norm } from "@/lib/utils";

export type ModuleCatalogTotal = {
  nome: (typeof MODULE_CATALOG)[number];
  total: number;
};

export function computeActiveModuleCatalogTotals(
  clientes: Array<{ id: string; situacao: string }>,
  bases: Array<{ id: string; municipioId: string; situacao: string }>,
  modulos: Array<{ baseId: string; nome: string; desabilitadoAt?: unknown | null }>,
): ModuleCatalogTotal[] {
  const activeClientIds = new Set(
    clientes.filter((cliente) => cliente.situacao === "cliente_ativo").map((cliente) => cliente.id),
  );
  const activeBaseIds = new Set(
    bases
      .filter((base) => base.situacao === "ativa" && activeClientIds.has(base.municipioId))
      .map((base) => base.id),
  );
  const catalogByNormalizedName = new Map(
    MODULE_CATALOG.map((nome) => [norm(nome.trim()), nome] as const),
  );
  const totals = new Map<(typeof MODULE_CATALOG)[number], number>(
    MODULE_CATALOG.map((nome) => [nome, 0]),
  );

  for (const modulo of modulos) {
    if (modulo.desabilitadoAt || !activeBaseIds.has(modulo.baseId)) continue;
    const catalogName = catalogByNormalizedName.get(norm(modulo.nome.trim()));
    if (!catalogName) continue;
    totals.set(catalogName, (totals.get(catalogName) ?? 0) + 1);
  }

  return MODULE_CATALOG.map((nome) => ({ nome, total: totals.get(nome) ?? 0 }));
}
