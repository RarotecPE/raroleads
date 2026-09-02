export const APP = {
  name: "Central de Clientes",
  shortName: "Central",
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
  { value: "formal", label: "Proposta formal", tone: "primary" },
  { value: "pregao", label: "Proposta de pregão", tone: "primary" },
  { value: "licitacao_final", label: "Proposta final de licitação", tone: "primary" },
  { value: "informal", label: "Negociação informal", tone: "muted" },
  { value: "solicitacao", label: "Solicitação comercial", tone: "muted" },
];

export const PROPOSTA_SITUACOES: Option[] = [
  { value: "criada", label: "Criada", tone: "muted" },
  { value: "apresentada", label: "Apresentada", tone: "primary" },
  { value: "aceita", label: "Aceita", tone: "success" },
  { value: "recusada", label: "Recusada", tone: "danger" },
  { value: "convertida", label: "Convertida em contrato", tone: "success" },
];

export const CONTRATO_MODALIDADES: Option[] = [
  { value: "licitacao", label: "Licitação", tone: "primary" },
  { value: "pregao", label: "Pregão", tone: "primary" },
  { value: "dispensa", label: "Dispensa", tone: "muted" },
  { value: "inexigibilidade", label: "Inexigibilidade", tone: "muted" },
  { value: "adesao", label: "Adesão (ata)", tone: "muted" },
  { value: "outros", label: "Outros", tone: "muted" },
];

export const CONTRATO_SITUACOES: Option[] = [
  { value: "recebido_sem_assinatura", label: "Recebido sem assinatura", tone: "warning" },
  { value: "aguardando_assinatura", label: "Aguardando assinatura", tone: "warning" },
  { value: "vigente", label: "Vigente", tone: "success" },
  { value: "encerrado", label: "Encerrado", tone: "muted" },
  { value: "cancelado", label: "Cancelado", tone: "danger" },
];

/** Situações derivadas pela data (não armazenadas). */
export const CONTRATO_DERIVADAS: Record<string, Option> = {
  proximo_vencimento: { value: "proximo_vencimento", label: "Próximo do vencimento", tone: "warning" },
  vencido: { value: "vencido", label: "Vencido", tone: "danger" },
};

export const ADITIVO_TIPOS: Option[] = [
  { value: "inclusao_modulo", label: "Inclusão de módulo", tone: "primary" },
  { value: "exclusao_modulo", label: "Exclusão de módulo", tone: "warning" },
  { value: "alteracao_prazo", label: "Alteração de prazo", tone: "primary" },
  { value: "alteracao_valor", label: "Alteração de valor", tone: "primary" },
  { value: "alteracao_contratual", label: "Alteração contratual", tone: "muted" },
];

export const HABILITACAO_ORIGENS: Option[] = [
  { value: "contrato", label: "Contrato", tone: "primary" },
  { value: "pregao", label: "Pregão", tone: "primary" },
  { value: "proposta", label: "Proposta", tone: "primary" },
  { value: "whatsapp", label: "WhatsApp", tone: "muted" },
  { value: "email", label: "E-mail", tone: "muted" },
  { value: "reuniao", label: "Reunião", tone: "muted" },
  { value: "verbal", label: "Solicitação verbal", tone: "muted" },
];

export const IMPLANTACAO_STATUS: Option[] = [
  { value: "nao_iniciada", label: "Não iniciada", tone: "muted" },
  { value: "em_andamento", label: "Em andamento", tone: "warning" },
  { value: "concluida", label: "Concluída", tone: "success" },
  { value: "suspensa", label: "Suspensa", tone: "danger" },
];

export const DESABILITACAO_MOTIVOS: Option[] = [
  { value: "sem_uso", label: "Cliente não utiliza", tone: "warning" },
  { value: "encerramento", label: "Encerramento", tone: "muted" },
  { value: "troca_sistema", label: "Troca de sistema", tone: "warning" },
  { value: "solicitacao_cliente", label: "Solicitação do cliente", tone: "primary" },
  { value: "cancelamento_contratual", label: "Cancelamento contratual", tone: "danger" },
];

export const DOCUMENTO_TIPOS: Option[] = [
  { value: "proposta", label: "Proposta", tone: "primary" },
  { value: "contrato", label: "Contrato", tone: "primary" },
  { value: "contrato_sem_assinatura", label: "Contrato sem assinatura", tone: "warning" },
  { value: "contrato_assinado", label: "Contrato assinado", tone: "success" },
  { value: "aditivo", label: "Aditivo", tone: "primary" },
  { value: "solicitacao", label: "Solicitação", tone: "muted" },
  { value: "evidencia_whatsapp", label: "Evidência WhatsApp", tone: "muted" },
  { value: "email", label: "E-mail", tone: "muted" },
  { value: "ata", label: "Ata", tone: "primary" },
  { value: "outros", label: "Outros", tone: "muted" },
];

export const CONTRATO_TIPOS: Option[] = [
  { value: "contrato", label: "Contrato", tone: "primary"},
  { value: "contrato_sem_assinatura", label: "Contrato sem assinatura", tone: "warning" },
  { value: "contrato_assinado", label: "Contrato assinado", tone: "success" },
]

export const PENDENCIA_TIPOS: Record<string, { label: string; tone: Tone }> = {
  habilitado_sem_contrato: { label: "Habilitado sem contrato", tone: "danger" },
  habilitado_sem_solicitacao: { label: "Habilitado sem solicitação", tone: "warning" },
  contratado_nao_habilitado: { label: "Contratado não habilitado", tone: "warning" },
  contrato_proximo_vencimento: { label: "Contrato próximo do vencimento", tone: "warning" },
  contrato_vencido: { label: "Contrato vencido", tone: "danger" },
  documento_ausente: { label: "Documento obrigatório ausente", tone: "warning" },
  base_incompleta: { label: "Base com informações insuficientes", tone: "muted" },
  manual: { label: "Pendência manual", tone: "primary" },
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
