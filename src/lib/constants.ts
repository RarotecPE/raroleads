export const APP = {
  name: "RaroLeads",
  shortName: "RaroLeads",
  description:
    "Gestao administrativa de clientes, bases, modulos, contratos e historico.",
};

export type Tone = "primary" | "success" | "warning" | "danger" | "muted";

export interface Option {
  value: string;
  label: string;
  tone: Tone;
}

export const MUNICIPIO_SITUACOES: Option[] = [
  { value: "prospect", label: "Prospect", tone: "muted" },
  { value: "em_negociacao", label: "Em negociação", tone: "warning" },
  { value: "cliente_ativo", label: "Cliente ativo", tone: "success" },
  { value: "cliente_suspenso", label: "Cliente suspenso", tone: "danger" },
  { value: "cliente_encerrado", label: "Cliente encerrado", tone: "muted" },
];

export const BASE_TIPOS = [
  "Prefeitura",
  "Saúde",
  "Educação",
  "Assistência",
  "Previdência",
  "Câmara",
  "Fundos",
  "Autarquias",
  "Outros",
] as const;

export const BASE_SITUACOES: Option[] = [
  { value: "ativa", label: "Ativa", tone: "success" },
  { value: "inativa", label: "Inativa", tone: "muted" },
];

/** Catálogo de módulos — usado em sugestões e na inteligência comercial. */
export const MODULE_CATALOG = [
  "Contabilidade",
  "RH",
  "Tributos",
  "Portal",
  "Almoxarifado",
  "Patrimônio",
  "Frota",
  "Compras",
  "Protocolo",
  "Planejamento",
] as const;

export const PROPOSTA_TIPOS: Option[] = [
  { value: "Proposta formal", label: "Proposta formal", tone: "primary" },
  { value: "Proposta de pregão", label: "Proposta de pregão", tone: "primary" },
  { value: "Proposta final de licitação", label: "Proposta final de licitação", tone: "primary" },
  { value: "Negociação informal", label: "Negociação informal", tone: "muted" },
  { value: "Solicitação comercial", label: "Solicitação comercial", tone: "muted" },
];

export const PROPOSTA_SITUACOES: Option[] = [
  { value: "Criada", label: "Criada", tone: "muted" },
  { value: "Apresentada", label: "Apresentada", tone: "primary" },
  { value: "Aceita", label: "Aceita", tone: "success" },
  { value: "Recusada", label: "Recusada", tone: "danger" },
  { value: "Convertida em contrato", label: "Convertida em contrato", tone: "success" },
];

export const CONTRATO_MODALIDADES: Option[] = [
  { value: "Licitação", label: "Licitação", tone: "primary" },
  { value: "Pregão", label: "Pregão", tone: "primary" },
  { value: "Dispensa", label: "Dispensa", tone: "muted" },
  { value: "Inexigibilidade", label: "Inexigibilidade", tone: "muted" },
  { value: "Adesão (ata)", label: "Adesão (ata)", tone: "muted" },
  { value: "Outros", label: "Outros", tone: "muted" },
];

export const CONTRATO_SITUACOES: Option[] = [
  { value: "recebido_sem_assinatura", label: "Recebido sem assinatura", tone: "warning" },
  { value: "aguardando_assinatura", label: "Aguardando assinatura", tone: "warning" },
  { value: "vigente", label: "Vigente", tone: "success" },
  { value: "encerrado", label: "Encerrado", tone: "muted" },
  { value: "cancelado", label: "Cancelado", tone: "danger" },
];

const CONTRATO_SITUACOES_LEGADAS: Record<string, string> = {
  "Recebido sem assinatura": "recebido_sem_assinatura",
  "Aguardando assinatura": "aguardando_assinatura",
  Vigente: "vigente",
  Encerrado: "encerrado",
  Cancelado: "cancelado",
};

export function normalizeContratoSituacao(value: string | null | undefined): string {
  if (!value) return "aguardando_assinatura";
  return CONTRATO_SITUACOES_LEGADAS[value] ?? value;
}

/** Situações derivadas pela data (não armazenadas). */
export const CONTRATO_DERIVADAS: Record<string, Option> = {
  proximo_vencimento: { value: "Próximo do vencimento", label: "Próximo do vencimento", tone: "warning" },
  vencido: { value: "Vencido", label: "Vencido", tone: "danger" },
};

export const ADITIVO_TIPO_ALTERACAO_PRAZO = "Alteração de prazo";
export const ADITIVO_TIPO_INCLUSAO_MODULO = "Inclusão de módulo";
export const ADITIVO_TIPO_EXCLUSAO_MODULO = "Exclusão de módulo";

export const ADITIVO_TIPOS: Option[] = [
  { value: ADITIVO_TIPO_INCLUSAO_MODULO, label: ADITIVO_TIPO_INCLUSAO_MODULO, tone: "primary" },
  { value: ADITIVO_TIPO_EXCLUSAO_MODULO, label: ADITIVO_TIPO_EXCLUSAO_MODULO, tone: "warning" },
  { value: ADITIVO_TIPO_ALTERACAO_PRAZO, label: ADITIVO_TIPO_ALTERACAO_PRAZO, tone: "primary" },
  { value: "Alteração de valor", label: "Alteração de valor", tone: "primary" },
  { value: "Alteração contratual", label: "Alteração contratual", tone: "muted" },
];

export const HABILITACAO_ORIGENS: Option[] = [
  { value: "Contrato", label: "Contrato", tone: "primary" },
  { value: "Pregão", label: "Pregão", tone: "primary" },
  { value: "Proposta", label: "Proposta", tone: "primary" },
  { value: "WhatsApp", label: "WhatsApp", tone: "muted" },
  { value: "E-mail", label: "E-mail", tone: "muted" },
  { value: "Reunião", label: "Reunião", tone: "muted" },
  { value: "Solicitação verbal", label: "Solicitação verbal", tone: "muted" },
];

export const IMPLANTACAO_STATUS: Option[] = [
  { value: "Não iniciada", label: "Não iniciada", tone: "muted" },
  { value: "Em andamento", label: "Em andamento", tone: "warning" },
  { value: "Concluída", label: "Concluída", tone: "success" },
  { value: "Suspensa", label: "Suspensa", tone: "danger" },
];

export const DESABILITACAO_MOTIVOS: Option[] = [
  { value: "Sem uso", label: "Cliente não utiliza", tone: "warning" },
  { value: "Encerramento", label: "Encerramento", tone: "muted" },
  { value: "Troca de sistema", label: "Troca de sistema", tone: "warning" },
  { value: "Solicitação do cliente", label: "Solicitação do cliente", tone: "primary" },
  { value: "Cancelamento contratual", label: "Cancelamento contratual", tone: "danger" },
  { value: "Inadimplência", label: "Inadimplência", tone: "danger" },
];

export const DOCUMENTO_TIPOS: Option[] = [
  { value: "Proposta", label: "Proposta", tone: "primary" },
  { value: "Contrato", label: "Contrato", tone: "primary" },
  { value: "Contrato sem assinatura", label: "Contrato sem assinatura", tone: "warning" },
  { value: "Contrato assinado", label: "Contrato assinado", tone: "success" },
  { value: "Aditivo", label: "Aditivo", tone: "primary" },
  { value: "Solicitação", label: "Solicitação", tone: "muted" },
  { value: "Evidência WhatsApp", label: "Evidência WhatsApp", tone: "muted" },
  { value: "E-mail", label: "E-mail", tone: "muted" },
  { value: "Ata", label: "Ata", tone: "primary" },
  { value: "Outros", label: "Outros", tone: "muted" },
];

export const CONTRATO_TIPOS: Option[] = [
  { value: "Contrato", label: "Contrato", tone: "primary"},
  { value: "Contrato sem assinatura", label: "Contrato sem assinatura", tone: "warning" },
  { value: "Contrato assinado", label: "Contrato assinado", tone: "success" },
]

export const PENDENCIA_TIPOS: Record<string, { label: string; tone: Tone }> = {
  habilitado_sem_contrato: { label: "Habilitado sem contrato", tone: "danger" },
  habilitado_sem_solicitacao: { label: "Habilitado sem solicitação", tone: "warning" },
  contratado_nao_habilitado: { label: "Contratado não habilitado", tone: "warning" },
  contrato_proximo_vencimento: { label: "Contrato próximo do vencimento", tone: "warning" },
  contrato_vencido: { label: "Contrato vencido", tone: "danger" },
  documento_ausente: { label: "Documento obrigatório ausente", tone: "warning" },
  base_incompleta: { label: "Base com informações insuficientes", tone: "muted" },
};

export const EVENTO_TIPOS: Record<string, string> = {
  municipio_criado: "Cliente criado",
  municipio_atualizado: "Cliente atualizado",
  base_criada: "Base criada",
  base_atualizada: "Base atualizada",
  modulo_criado: "Módulo criado",
  habilitacao_solicitada: "Habilitação solicitada",
  habilitado: "Módulo habilitado",
  migracao: "Migração",
  implantacao: "Implantação",
  execucao_iniciada: "Execução iniciada",
  desabilitado: "Módulo desabilitado",
  reabilitado: "Módulo reabilitado",
  proposta_criada: "Proposta criada",
  proposta_situacao: "Situação da proposta",
  contrato_criado: "Contrato criado",
  contrato_situacao: "Situação do contrato",
  modulo_vinculado: "Módulo vinculado ao contrato",
  modulo_desvinculado: "Módulo desvinculado do contrato",
  aditivo_criado: "Aditivo registrado",
  documento_anexado: "Documento anexado",
  pendencia_resolvida: "Pendência resolvida",
};

const ALL = [
  ...MUNICIPIO_SITUACOES,
  ...BASE_SITUACOES,
  ...PROPOSTA_TIPOS,
  ...PROPOSTA_SITUACOES,
  ...CONTRATO_MODALIDADES,
  ...CONTRATO_SITUACOES,
  ...ADITIVO_TIPOS,
  ...HABILITACAO_ORIGENS,
  ...IMPLANTACAO_STATUS,
  ...DESABILITACAO_MOTIVOS,
  ...DOCUMENTO_TIPOS,
  ...Object.values(CONTRATO_DERIVADAS),
];

export function optLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ALL.find((o) => o.value === value)?.label ?? value;
}

export function optTone(value: string | null | undefined): Tone {
  if (!value) return "muted";
  return ALL.find((o) => o.value === value)?.tone ?? "muted";
}
