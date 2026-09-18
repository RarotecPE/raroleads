export const CONTRACT_DOCUMENT_TYPE = "Contrato";

const LEGACY_CONTRACT_DOCUMENT_TYPES = new Set([
  "contrato",
  "contrato_assinado",
  "contrato_sem_assinatura",
  "Contrato assinado",
  "Contrato sem assinatura",
]);

export function isContractDocumentType(tipo: string) {
  return tipo === CONTRACT_DOCUMENT_TYPE || LEGACY_CONTRACT_DOCUMENT_TYPES.has(tipo);
}

export function contractedModuleIds(links: { baseModuleId: string }[]) {
  return new Set(links.map((link) => link.baseModuleId));
}

export function occupiedBaseIds(
  links: { baseModuleId: string }[],
  modules: { id: string; baseId: string }[],
) {
  const baseByModule = new Map(modules.map((module) => [module.id, module.baseId]));
  return new Set(links.map((link) => baseByModule.get(link.baseModuleId)).filter((id): id is string => !!id));
}

export function validateBaseAvailability(
  baseIds: Iterable<string>,
  links: { baseId: string; contratoId: string }[],
  contratoId?: string,
) {
  const selected = new Set(baseIds);
  if (links.some((link) => selected.has(link.baseId) && link.contratoId !== contratoId)) {
    throw new Error("Uma base selecionada já está vinculada a outro contrato. Desvincule-a antes de continuar.");
  }
}

export const CONTRACT_UNLINK_REASONS = [
  "Substituição por novo contrato",
  "Encerramento do vínculo",
  "Correção de cadastro",
  "Outro",
] as const;

export function validateContractModuleSelection(
  moduleIds: string[],
  selectedModules: { id: string; baseId: string }[],
  clientBaseIds: Iterable<string>,
) {
  if (moduleIds.length === 0) throw new Error("Selecione ao menos um módulo contemplado pelo contrato.");
  const validBases = new Set(clientBaseIds);
  if (selectedModules.length !== moduleIds.length || selectedModules.some((modulo) => !validBases.has(modulo.baseId))) {
    throw new Error("Selecione apenas bases e módulos cadastrados para este cliente.");
  }
}

export function documentTypeForContext(contratoId: string | null, requestedType: string | null) {
  return contratoId ? CONTRACT_DOCUMENT_TYPE : requestedType ?? "outros";
}

const RETIRED_PENDING_TYPES = new Set(["contrato_proximo_vencimento", "contrato_vencido"]);
const RETIRED_EVENT_TYPES = new Set(["contrato_situacao", "contrato_assinatura", "aditivo_criado"]);

export function isOperationalPendingType(tipo: string) {
  return !RETIRED_PENDING_TYPES.has(tipo);
}

export function isOperationalEvent(event: { tipo: string; aditivoId?: string | null }) {
  return !event.aditivoId && !RETIRED_EVENT_TYPES.has(event.tipo);
}
