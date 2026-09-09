-- Current RaroLeads schema based on src/db/schema.ts.
-- Target database: PostgreSQL.
-- The app also generates ids in code; the database default below keeps
-- direct SQL inserts usable.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "municipios" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nome" text NOT NULL,
  "uf" text NOT NULL,
  "codigo_ibge" text,
  "populacao" integer,
  "situacao" text NOT NULL DEFAULT 'prospect',
  "dados_administrativos" text,
  "observacoes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "bases" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'outros',
  "cnpj" text,
  "situacao" text NOT NULL DEFAULT 'ativa',
  "observacoes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "bases_municipio_id_municipios_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "municipios" ("id")
);

CREATE TABLE IF NOT EXISTS "base_modules" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "base_id" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'sistema',
  "observacoes" text,
  "solicitante" text,
  "solicitacao_at" date,
  "solicitacao_origem" text,
  "habilitado_at" date,
  "migracao_inicio" date,
  "migracao_fim" date,
  "implantacao_status" text NOT NULL DEFAULT 'nao_iniciada',
  "execucao_inicio" date,
  "desabilitado_at" date,
  "desabilitado_motivo" text,
  "desabilitado_justificativa" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "base_modules_base_id_bases_id_fk"
    FOREIGN KEY ("base_id") REFERENCES "bases" ("id")
);

CREATE TABLE IF NOT EXISTS "propostas" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'formal',
  "data" date,
  "situacao" text NOT NULL DEFAULT 'criada',
  "bases_envolvidas" text,
  "modulos_envolvidos" text,
  "observacoes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "propostas_municipio_id_municipios_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "municipios" ("id")
);

CREATE TABLE IF NOT EXISTS "contratos" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text NOT NULL,
  "proposta_id" text,
  "numero" text NOT NULL,
  "modalidade" text NOT NULL DEFAULT 'outros',
  "processo" text,
  "data_assinatura" date,
  "data_inicio" date,
  "data_fim" date,
  "situacao" text NOT NULL DEFAULT 'aguardando_assinatura',
  "observacoes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "contratos_municipio_id_municipios_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "municipios" ("id"),
  CONSTRAINT "contratos_proposta_id_propostas_id_fk"
    FOREIGN KEY ("proposta_id") REFERENCES "propostas" ("id")
);

CREATE TABLE IF NOT EXISTS "contrato_modulos" (
  "contrato_id" text NOT NULL,
  "base_module_id" text NOT NULL,
  CONSTRAINT "contrato_modulos_contrato_id_base_module_id_pk"
    PRIMARY KEY ("contrato_id", "base_module_id"),
  CONSTRAINT "contrato_modulos_contrato_id_contratos_id_fk"
    FOREIGN KEY ("contrato_id") REFERENCES "contratos" ("id"),
  CONSTRAINT "contrato_modulos_base_module_id_base_modules_id_fk"
    FOREIGN KEY ("base_module_id") REFERENCES "base_modules" ("id")
);

CREATE TABLE IF NOT EXISTS "aditivos" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contrato_id" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'alteracao_contratual',
  "data" date,
  "descricao" text NOT NULL,
  "nova_data_fim" date,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "aditivos_contrato_id_contratos_id_fk"
    FOREIGN KEY ("contrato_id") REFERENCES "contratos" ("id")
);

CREATE TABLE IF NOT EXISTS "eventos" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text,
  "base_id" text,
  "base_module_id" text,
  "contrato_id" text,
  "tipo" text NOT NULL,
  "descricao" text NOT NULL,
  "data" date NOT NULL,
  "usuario" text NOT NULL DEFAULT 'Equipe Interna',
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "eventos_municipio_id_municipios_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "municipios" ("id"),
  CONSTRAINT "eventos_base_id_bases_id_fk"
    FOREIGN KEY ("base_id") REFERENCES "bases" ("id"),
  CONSTRAINT "eventos_base_module_id_base_modules_id_fk"
    FOREIGN KEY ("base_module_id") REFERENCES "base_modules" ("id"),
  CONSTRAINT "eventos_contrato_id_contratos_id_fk"
    FOREIGN KEY ("contrato_id") REFERENCES "contratos" ("id")
);

CREATE TABLE IF NOT EXISTS "documentos" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text,
  "base_id" text,
  "base_module_id" text,
  "contrato_id" text,
  "evento_id" text,
  "tipo" text NOT NULL DEFAULT 'outros',
  "nome" text NOT NULL,
  "referencia" text,
  "observacoes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "documentos_municipio_id_municipios_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "municipios" ("id"),
  CONSTRAINT "documentos_base_id_bases_id_fk"
    FOREIGN KEY ("base_id") REFERENCES "bases" ("id"),
  CONSTRAINT "documentos_base_module_id_base_modules_id_fk"
    FOREIGN KEY ("base_module_id") REFERENCES "base_modules" ("id"),
  CONSTRAINT "documentos_contrato_id_contratos_id_fk"
    FOREIGN KEY ("contrato_id") REFERENCES "contratos" ("id"),
  CONSTRAINT "documentos_evento_id_eventos_id_fk"
    FOREIGN KEY ("evento_id") REFERENCES "eventos" ("id")
);

CREATE TABLE IF NOT EXISTS "pendencias" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tipo" text NOT NULL,
  "descricao" text NOT NULL,
  "origem" text NOT NULL DEFAULT 'auto',
  "situacao" text NOT NULL DEFAULT 'aberta',
  "municipio_id" text,
  "base_id" text,
  "base_module_id" text,
  "contrato_id" text,
  "resolved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "pendencias_municipio_id_municipios_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "municipios" ("id"),
  CONSTRAINT "pendencias_base_id_bases_id_fk"
    FOREIGN KEY ("base_id") REFERENCES "bases" ("id"),
  CONSTRAINT "pendencias_base_module_id_base_modules_id_fk"
    FOREIGN KEY ("base_module_id") REFERENCES "base_modules" ("id"),
  CONSTRAINT "pendencias_contrato_id_contratos_id_fk"
    FOREIGN KEY ("contrato_id") REFERENCES "contratos" ("id")
);
