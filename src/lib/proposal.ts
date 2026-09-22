import { BASE_TIPOS, MODULE_CATALOG } from "@/lib/constants";
import { norm } from "@/lib/utils";

export const PROPOSTA_MODALIDADES = ["implantacao_sistema", "consultoria"] as const;
export const PROPOSTA_STATUS = ["solicitada", "gerada", "enviada", "aceita", "recusada", "em_retificacao", "cancelada"] as const;
export const PROPOSTA_ESPECIFICIDADES = ["portal", "sagres", "esocial", "recadastramento"] as const;

export type PropostaStatus = (typeof PROPOSTA_STATUS)[number];

export type ProposalImmutableIdentity = {
  tipo: string;
  municipioId: string | null;
  clienteNomeSnapshot: string;
  municipioNome: string;
  uf: string;
  codigoIbge: string | null;
};

const TRANSITIONS: Record<PropostaStatus, PropostaStatus[]> = {
  solicitada: ["gerada", "cancelada"],
  gerada: ["enviada", "em_retificacao"],
  enviada: ["aceita", "recusada", "em_retificacao"],
  em_retificacao: ["gerada"],
  aceita: [],
  recusada: [],
  cancelada: [],
};

export function assertPropostaTransition(from: string, to: PropostaStatus) {
  if (!PROPOSTA_STATUS.includes(from as PropostaStatus) || !TRANSITIONS[from as PropostaStatus].includes(to)) {
    throw new Error(`Transição de proposta inválida: ${from} → ${to}.`);
  }
}

export function assertProposalDeletionAllowed(status: string, excluidaAt?: Date | string | null) {
  if (excluidaAt) throw new Error("A proposta já foi excluída.");
  if (status !== "cancelada") throw new Error("Somente propostas canceladas podem ser excluídas.");
}

export function requireProposalCancellationReason(value: string | null | undefined) {
  const reason = value?.trim();
  if (!reason) throw new Error("Informe o motivo do cancelamento.");
  return reason;
}

export function propostaStatusLabel(status: string) {
  return ({
    solicitada: "Solicitada",
    gerada: "Gerada",
    enviada: "Enviada",
    aceita: "Aceita",
    recusada: "Recusada",
    em_retificacao: "Em retificação",
    cancelada: "Cancelada",
  } as Record<string, string>)[status] ?? status;
}

const PROPOSTA_HISTORICO_ACAO_LABELS: Record<string, string> = {
  solicitada: "Proposta solicitada",
  documento_gerado: "Proposta gerada",
  falha_documento: "Falha ao gerar proposta",
  enviada: "Proposta enviada",
  envio_falhou: "Falha no envio da proposta",
  aceita: "Proposta aceita",
  recusada: "Proposta recusada",
  em_retificacao: "Proposta em retificação",
  editada: "Proposta editada",
  enviada_manualmente: "Proposta marcada como enviada manualmente",
  cadastros_criados: "Cadastros da proposta criados",
  cadastros_criacao_falhou: "Falha ao criar cadastros da proposta",
  cancelada: "Proposta cancelada",
  excluida: "Proposta excluída",
};

export function propostaHistoricoAcaoLabel(acao: string) {
  return PROPOSTA_HISTORICO_ACAO_LABELS[acao] ?? acao;
}

export function canonicalProposalModuleName(value: string) {
  return MODULE_CATALOG.find((name) => norm(name) === norm(value.trim())) ?? null;
}

export function canonicalProposalBaseType(value: string | null | undefined) {
  if (!value) return null;
  return BASE_TIPOS.find((type) => norm(type) === norm(value.trim())) ?? null;
}

export function hasProposalBaseType(tipo: string | null | undefined, existingBases: { tipo: string | null }[]) {
  if (!tipo) return false;
  return existingBases.some((base) => Boolean(base.tipo) && norm(base.tipo!.trim()) === norm(tipo.trim()));
}

export function proposalClientsByIbge<T extends { codigoIbge: string | null }>(codigoIbge: string | null | undefined, clients: T[]) {
  if (!codigoIbge?.trim()) return [];
  return clients.filter((client) => client.codigoIbge?.trim() === codigoIbge.trim());
}

export function assertUniqueProposalScope(items: { nome: string; modulos: { nome: string }[] }[]) {
  const baseNames = items.map((item) => norm(item.nome.trim()));
  if (new Set(baseNames).size !== baseNames.length) throw new Error("Não é possível adicionar a mesma base mais de uma vez.");
  for (const item of items) {
    const moduleNames = item.modulos.map((module) => norm(module.nome.trim()));
    if (new Set(moduleNames).size !== moduleNames.length) throw new Error(`O módulo foi repetido na base ${item.nome}.`);
  }
}

export function selectProposalClientCandidate<T extends { situacao: string }>(candidates: T[]) {
  if (candidates.length > 1) throw new Error("Há mais de um cliente correspondente ao município da proposta.");
  const [candidate] = candidates;
  if (candidate?.situacao === "cliente_encerrado") throw new Error("O cliente correspondente está encerrado.");
  return candidate ?? null;
}

export function assertProposalIdentityUnchanged(current: ProposalImmutableIdentity, submitted: ProposalImmutableIdentity) {
  const unchanged = current.tipo === submitted.tipo
    && current.municipioId === submitted.municipioId
    && current.clienteNomeSnapshot === submitted.clienteNomeSnapshot
    && current.municipioNome === submitted.municipioNome
    && current.uf === submitted.uf
    && current.codigoIbge === submitted.codigoIbge;
  if (!unchanged) throw new Error("Cliente e modalidade da proposta não podem ser alterados.");
}

const PROPOSAL_UUID_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function parseProposalOriginNote(value: string) {
  const match = value.match(new RegExp(`^(.*?)(proposta)( aceita)\\s+(${PROPOSAL_UUID_SOURCE})(.*)$`, "i"));
  if (!match) return null;
  return {
    before: match[1],
    label: match[2],
    after: `${match[3]}${match[5]}`,
    proposalId: match[4],
  };
}

export function hideProposalIds(value: string) {
  return value.replace(new RegExp(`(\\bproposta(?:\\s+aceita)?)\\s+${PROPOSAL_UUID_SOURCE}(?=[\\s.,;:!?]|$)`, "gi"), "$1");
}
