export const PROPOSTA_MODALIDADES = ["implantacao_sistema", "consultoria"] as const;
export const PROPOSTA_STATUS = ["solicitada", "gerada", "enviada", "aceita", "recusada", "em_retificacao"] as const;
export const PROPOSTA_ESPECIFICIDADES = ["portal", "sagres", "esocial", "recadastramento"] as const;

export type PropostaStatus = (typeof PROPOSTA_STATUS)[number];

const TRANSITIONS: Record<PropostaStatus, PropostaStatus[]> = {
  solicitada: ["gerada"],
  gerada: ["enviada"],
  enviada: ["aceita", "recusada", "em_retificacao"],
  em_retificacao: ["gerada"],
  aceita: [],
  recusada: [],
};

export function assertPropostaTransition(from: string, to: PropostaStatus) {
  if (!PROPOSTA_STATUS.includes(from as PropostaStatus) || !TRANSITIONS[from as PropostaStatus].includes(to)) {
    throw new Error(`Transição de proposta inválida: ${from} → ${to}.`);
  }
}

export function propostaStatusLabel(status: string) {
  return ({
    solicitada: "Solicitada",
    gerada: "Gerada",
    enviada: "Enviada",
    aceita: "Aceita",
    recusada: "Recusada",
    em_retificacao: "Em retificação",
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
  cadastros_criados: "Cadastros da proposta criados",
  cadastros_criacao_falhou: "Falha ao criar cadastros da proposta",
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

export function assertUniqueProposalScope(items: { nome: string; modulos: { nome: string }[] }[]) {
  const baseNames = items.map((item) => norm(item.nome.trim()));
  if (new Set(baseNames).size !== baseNames.length) throw new Error("Não é possível adicionar a mesma base mais de uma vez.");
  for (const item of items) {
    const moduleNames = item.modulos.map((module) => norm(module.nome.trim()));
    if (new Set(moduleNames).size !== moduleNames.length) throw new Error(`O módulo foi repetido na base ${item.nome}.`);
  }
}
import { BASE_TIPOS, MODULE_CATALOG } from "@/lib/constants";
import { norm } from "@/lib/utils";
