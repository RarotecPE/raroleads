ALTER TABLE "propostas" ALTER COLUMN "municipio_id" DROP NOT NULL;
ALTER TABLE "propostas" DROP CONSTRAINT IF EXISTS "propostas_municipio_id_municipios_id_fk";
ALTER TABLE "propostas" DROP CONSTRAINT IF EXISTS "propostas_municipio_id_clientes_id_fk";
ALTER TABLE "propostas"
  ADD CONSTRAINT "propostas_municipio_id_clientes_id_fk"
  FOREIGN KEY ("municipio_id") REFERENCES "clientes"("id") ON DELETE SET NULL;
ALTER TABLE "propostas" ALTER COLUMN "tipo" SET DEFAULT 'implantacao_sistema';
ALTER TABLE "propostas" ALTER COLUMN "situacao" SET DEFAULT 'solicitada';

ALTER TABLE "propostas"
  ADD COLUMN IF NOT EXISTS "cliente_nome_snapshot" text,
  ADD COLUMN IF NOT EXISTS "municipio_nome" text,
  ADD COLUMN IF NOT EXISTS "uf" text,
  ADD COLUMN IF NOT EXISTS "codigo_ibge" text,
  ADD COLUMN IF NOT EXISTS "atividade_conjunta" boolean,
  ADD COLUMN IF NOT EXISTS "gerada_at" timestamp,
  ADD COLUMN IF NOT EXISTS "enviada_at" timestamp,
  ADD COLUMN IF NOT EXISTS "decisao_at" timestamp;

UPDATE "propostas" p
SET
  "cliente_nome_snapshot" = COALESCE(p."cliente_nome_snapshot", c."cliente_nome", 'Cliente legado'),
  "municipio_nome" = COALESCE(p."municipio_nome", c."municipio", 'Município não informado'),
  "uf" = COALESCE(p."uf", c."uf", '--'),
  "codigo_ibge" = COALESCE(p."codigo_ibge", c."codigo_ibge"),
  "observacoes" = CASE
    WHEN p."tipo" IN ('implantacao_sistema', 'consultoria') THEN p."observacoes"
    ELSE CONCAT_WS(E'\n', p."observacoes", 'Tipo legado: ' || p."tipo")
  END,
  "tipo" = CASE WHEN p."tipo" IN ('implantacao_sistema', 'consultoria') THEN p."tipo" ELSE 'implantacao_sistema' END,
  "situacao" = CASE lower(p."situacao")
    WHEN 'criada' THEN 'solicitada'
    WHEN 'apresentada' THEN 'enviada'
    WHEN 'convertida' THEN 'aceita'
    WHEN 'aceita' THEN 'aceita'
    WHEN 'recusada' THEN 'recusada'
    WHEN 'convertida em contrato' THEN 'aceita'
    ELSE p."situacao"
  END
FROM "clientes" c
WHERE p."municipio_id" = c."id";

UPDATE "propostas"
SET
  "cliente_nome_snapshot" = COALESCE("cliente_nome_snapshot", 'Cliente legado'),
  "municipio_nome" = COALESCE("municipio_nome", 'Município não informado'),
  "uf" = COALESCE("uf", '--')
WHERE "cliente_nome_snapshot" IS NULL OR "municipio_nome" IS NULL OR "uf" IS NULL;

ALTER TABLE "propostas"
  ALTER COLUMN "cliente_nome_snapshot" SET NOT NULL,
  ALTER COLUMN "municipio_nome" SET NOT NULL,
  ALTER COLUMN "uf" SET NOT NULL;

CREATE OR REPLACE FUNCTION normalize_proposta_legacy_insert()
RETURNS trigger AS $$
DECLARE cliente_row "clientes"%ROWTYPE;
BEGIN
  IF NEW."municipio_id" IS NOT NULL THEN
    SELECT * INTO cliente_row FROM "clientes" WHERE "id" = NEW."municipio_id";
  END IF;
  NEW."cliente_nome_snapshot" := COALESCE(NEW."cliente_nome_snapshot", cliente_row."cliente_nome", 'Cliente não informado');
  NEW."municipio_nome" := COALESCE(NEW."municipio_nome", cliente_row."municipio", 'Município não informado');
  NEW."uf" := COALESCE(NEW."uf", cliente_row."uf", '--');
  NEW."codigo_ibge" := COALESCE(NEW."codigo_ibge", cliente_row."codigo_ibge");
  IF NEW."tipo" NOT IN ('implantacao_sistema', 'consultoria') THEN NEW."tipo" := 'implantacao_sistema'; END IF;
  NEW."situacao" := CASE lower(NEW."situacao")
    WHEN 'criada' THEN 'solicitada' WHEN 'convertida' THEN 'aceita'
    WHEN 'apresentada' THEN 'enviada' WHEN 'convertida em contrato' THEN 'aceita'
    ELSE NEW."situacao" END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS propostas_normalize_legacy_insert ON "propostas";
CREATE TRIGGER propostas_normalize_legacy_insert
BEFORE INSERT ON "propostas"
FOR EACH ROW EXECUTE FUNCTION normalize_proposta_legacy_insert();

CREATE TABLE IF NOT EXISTS "proposta_bases" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "proposta_id" text NOT NULL REFERENCES "propostas"("id") ON DELETE CASCADE,
  "base_id" text REFERENCES "bases"("id") ON DELETE SET NULL,
  "nome" text NOT NULL,
  "tipo" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "proposta_modulos" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "proposta_base_id" text NOT NULL REFERENCES "proposta_bases"("id") ON DELETE CASCADE,
  "base_module_id" text REFERENCES "base_modules"("id") ON DELETE SET NULL,
  "nome" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "proposta_especificidades" (
  "proposta_id" text NOT NULL REFERENCES "propostas"("id") ON DELETE CASCADE,
  "especificidade" text NOT NULL,
  PRIMARY KEY ("proposta_id", "especificidade")
);

ALTER TABLE "documentos" ADD COLUMN IF NOT EXISTS "proposta_versao" integer;
WITH versoes AS (
  SELECT "id", row_number() OVER (PARTITION BY "proposta_id" ORDER BY "created_at", "id") AS versao
  FROM "documentos" WHERE "proposta_id" IS NOT NULL
)
UPDATE "documentos" d SET "proposta_versao" = v.versao
FROM versoes v WHERE d."id" = v."id" AND d."proposta_versao" IS NULL;

CREATE TABLE IF NOT EXISTS "proposta_historico" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "proposta_id" text NOT NULL REFERENCES "propostas"("id") ON DELETE CASCADE,
  "documento_id" text REFERENCES "documentos"("id") ON DELETE SET NULL,
  "acao" text NOT NULL,
  "status_anterior" text,
  "status_novo" text,
  "descricao" text NOT NULL,
  "usuario" text NOT NULL DEFAULT 'Equipe Interna',
  "destinatario_email" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "proposta_bases_proposta_id_idx" ON "proposta_bases" ("proposta_id");
CREATE INDEX IF NOT EXISTS "proposta_modulos_proposta_base_id_idx" ON "proposta_modulos" ("proposta_base_id");
CREATE INDEX IF NOT EXISTS "proposta_historico_proposta_id_idx" ON "proposta_historico" ("proposta_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "documentos_proposta_versao_uidx"
  ON "documentos" ("proposta_id", "proposta_versao")
  WHERE "proposta_id" IS NOT NULL AND "proposta_versao" IS NOT NULL;
