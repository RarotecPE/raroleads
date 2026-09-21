export type DisableCascadeBase = {
  id: string;
  baseSuperiorId: string | null;
  situacao: string;
  desabilitacaoOrigemBaseId: string | null;
};

export type DisableCascadeModule = {
  id: string;
  baseId: string;
  desabilitadoAt: string | null;
  desabilitacaoOrigemBaseId: string | null;
};

export function planBaseDisable(
  rootBaseId: string,
  allBases: DisableCascadeBase[],
  allModules: DisableCascadeModule[],
) {
  const root = allBases.find((base) => base.id === rootBaseId);
  if (!root) throw new Error("Base nao encontrada.");
  if (root.situacao !== "ativa") throw new Error("A base ja esta desabilitada.");

  const scopeBaseIds = new Set([
    rootBaseId,
    ...allBases.filter((base) => base.baseSuperiorId === rootBaseId).map((base) => base.id),
  ]);

  return {
    scopeBaseIds: [...scopeBaseIds],
    baseIdsToDisable: allBases
      .filter((base) => scopeBaseIds.has(base.id) && base.situacao === "ativa")
      .map((base) => base.id),
    moduleIdsToDisable: allModules
      .filter((module) => scopeBaseIds.has(module.baseId) && !module.desabilitadoAt)
      .map((module) => module.id),
  };
}

export function planBaseReactivation(
  rootBaseId: string,
  allBases: DisableCascadeBase[],
  allModules: DisableCascadeModule[],
) {
  const root = allBases.find((base) => base.id === rootBaseId);
  if (!root) throw new Error("Base nao encontrada.");
  if (root.desabilitacaoOrigemBaseId !== rootBaseId) {
    throw new Error("A reativacao deve ser realizada pela base que originou a desabilitacao.");
  }

  return {
    baseIdsToReactivate: allBases
      .filter((base) => base.desabilitacaoOrigemBaseId === rootBaseId)
      .map((base) => base.id),
    moduleIdsToReactivate: allModules
      .filter((module) => module.desabilitacaoOrigemBaseId === rootBaseId)
      .map((module) => module.id),
  };
}
