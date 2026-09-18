import { cnpjDigits } from "@/lib/cnpj";
import { norm } from "@/lib/utils";

export type NewChildBase = {
  nome: string;
  tipo: string;
  cnpj: string | null;
  observacoes: string | null;
};

export type HierarchyBase = {
  id: string;
  municipioId: string;
  baseSuperiorId: string | null;
};

export function parseNewChildBases(raw: string | null): NewChildBase[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Os dados das bases inferiores são inválidos.");
  }
  if (!Array.isArray(parsed) || parsed.length > 100) throw new Error("Informe até 100 bases inferiores válidas.");
  return parsed.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Os dados das bases inferiores são inválidos.");
    const draft = item as Record<string, unknown>;
    const nome = typeof draft.nome === "string" ? draft.nome.trim() : "";
    const tipo = typeof draft.tipo === "string" ? draft.tipo.trim() : "";
    if (!nome || !tipo || (draft.cnpj != null && typeof draft.cnpj !== "string") ||
      (draft.observacoes != null && typeof draft.observacoes !== "string")) {
      throw new Error("Informe nome e tipo de cada base inferior.");
    }
    return {
      nome,
      tipo,
      cnpj: cnpjDigits(typeof draft.cnpj === "string" ? draft.cnpj : "") || null,
      observacoes: typeof draft.observacoes === "string" ? draft.observacoes.trim() || null : null,
    };
  });
}

export function validateChildBaseLinks(
  parent: HierarchyBase | null,
  municipioId: string,
  existingChildIds: string[],
  newChildren: NewChildBase[],
  allBases: HierarchyBase[],
) {
  if (parent?.baseSuperiorId && (existingChildIds.length > 0 || newChildren.length > 0)) {
    throw new Error("Uma base inferior não pode possuir bases inferiores.");
  }
  const uniqueIds = new Set(existingChildIds);
  if (uniqueIds.size !== existingChildIds.length) throw new Error("A lista de bases inferiores contém itens repetidos.");
  const byId = new Map(allBases.map((base) => [base.id, base]));
  for (const id of existingChildIds) {
    const child = byId.get(id);
    if (!child || child.municipioId !== municipioId || child.id === parent?.id ||
      child.baseSuperiorId || allBases.some((base) => base.baseSuperiorId === id)) {
      throw new Error("Selecione apenas bases livres deste município, sem bases inferiores próprias.");
    }
  }
}

export function basesMissingModule(
  children: { id: string }[],
  modules: { baseId: string; nome: string }[],
  nome: string,
) {
  const normalizedName = norm(nome.trim());
  const existing = new Set(modules.filter((module) => norm(module.nome.trim()) === normalizedName).map((module) => module.baseId));
  return children.filter((child) => !existing.has(child.id));
}
