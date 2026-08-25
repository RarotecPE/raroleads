import {
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/* FASE 1 — Estrutura principal */

export const municipios = pgTable("municipios", {
  id: id(),
  nome: text("nome").notNull(),
  uf: text("uf").notNull(),
  codigoIbge: text("codigo_ibge"),
  populacao: integer("populacao"),
  situacao: text("situacao").notNull().default("prospect"),
  dadosAdministrativos: text("dados_administrativos"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bases = pgTable("bases", {
  id: id(),
  municipioId: text("municipio_id")
    .notNull()
    .references(() => municipios.id),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("outros"),
  cnpj: text("cnpj"),
  situacao: text("situacao").notNull().default("ativa"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* FASE 3 — Operação (ciclo de vida do módulo) */

export const baseModules = pgTable("base_modules", {
  id: id(),
  baseId: text("base_id")
    .notNull()
    .references(() => bases.id),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("sistema"),
  observacoes: text("observacoes"),
  solicitante: text("solicitante"),
  solicitacaoAt: date("solicitacao_at"),
  solicitacaoOrigem: text("solicitacao_origem"),
  habilitadoAt: date("habilitado_at"),
  migracaoInicio: date("migracao_inicio"),
  migracaoFim: date("migracao_fim"),
  implantacaoStatus: text("implantacao_status")
    .notNull()
    .default("nao_iniciada"),
  execucaoInicio: date("execucao_inicio"),
  desabilitadoAt: date("desabilitado_at"),
  desabilitadoMotivo: text("desabilitado_motivo"),
  desabilitadoJustificativa: text("desabilitado_justificativa"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* FASE 2 — Contratação */

export const propostas = pgTable("propostas", {
  id: id(),
  municipioId: text("municipio_id")
    .notNull()
    .references(() => municipios.id),
  tipo: text("tipo").notNull().default("formal"),
  data: date("data"),
  situacao: text("situacao").notNull().default("criada"),
  basesEnvolvidas: text("bases_envolvidas"),
  modulosEnvolvidos: text("modulos_envolvidos"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contratos = pgTable("contratos", {
  id: id(),
  municipioId: text("municipio_id")
    .notNull()
    .references(() => municipios.id),
  propostaId: text("proposta_id").references(() => propostas.id),
  numero: text("numero").notNull(),
  modalidade: text("modalidade").notNull().default("outros"),
  processo: text("processo"),
  dataAssinatura: date("data_assinatura"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  situacao: text("situacao").notNull().default("aguardando_assinatura"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contratoModulos = pgTable(
  "contrato_modulos",
  {
    contratoId: text("contrato_id")
      .notNull()
      .references(() => contratos.id),
    baseModuleId: text("base_module_id")
      .notNull()
      .references(() => baseModules.id),
  },
  (t) => [primaryKey({ columns: [t.contratoId, t.baseModuleId] })],
);

export const aditivos = pgTable("aditivos", {
  id: id(),
  contratoId: text("contrato_id")
    .notNull()
    .references(() => contratos.id),
  tipo: text("tipo").notNull().default("alteracao_contratual"),
  data: date("data"),
  descricao: text("descricao").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* FASE 4 — Histórico */

export const eventos = pgTable("eventos", {
  id: id(),
  municipioId: text("municipio_id").references(() => municipios.id),
  baseId: text("base_id").references(() => bases.id),
  baseModuleId: text("base_module_id").references(() => baseModules.id),
  contratoId: text("contrato_id").references(() => contratos.id),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  data: date("data").notNull(),
  usuario: text("usuario").notNull().default("Equipe Interna"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentos = pgTable("documentos", {
  id: id(),
  municipioId: text("municipio_id").references(() => municipios.id),
  baseId: text("base_id").references(() => bases.id),
  baseModuleId: text("base_module_id").references(() => baseModules.id),
  contratoId: text("contrato_id").references(() => contratos.id),
  eventoId: text("evento_id").references(() => eventos.id),
  tipo: text("tipo").notNull().default("outros"),
  nome: text("nome").notNull(),
  referencia: text("referencia"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* FASE 5 — Gestão */

export const pendencias = pgTable("pendencias", {
  id: id(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  origem: text("origem").notNull().default("auto"),
  situacao: text("situacao").notNull().default("aberta"),
  municipioId: text("municipio_id").references(() => municipios.id),
  baseId: text("base_id").references(() => bases.id),
  baseModuleId: text("base_module_id").references(() => baseModules.id),
  contratoId: text("contrato_id").references(() => contratos.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
