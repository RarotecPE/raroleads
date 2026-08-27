DO $$
BEGIN
  IF to_regclass('public.municipios') IS NOT NULL AND to_regclass('public.clientes') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "municipios" LIMIT 1) THEN
      RAISE EXCEPTION 'Both public.municipios and public.clientes exist with data; manual merge is required.';
    END IF;

    DROP TABLE "municipios";
  END IF;

  IF to_regclass('public.municipios') IS NOT NULL THEN
    ALTER TABLE "municipios"
      ADD COLUMN IF NOT EXISTS "cliente_nome" text;

    UPDATE "municipios"
    SET "cliente_nome" = "nome"
    WHERE "cliente_nome" IS NULL OR btrim("cliente_nome") = '';

    ALTER TABLE "municipios"
      ALTER COLUMN "cliente_nome" SET NOT NULL;

    ALTER TABLE "municipios"
      RENAME COLUMN "nome" TO "municipio";

    IF to_regclass('public.clientes') IS NULL THEN
      ALTER TABLE "municipios" RENAME TO "clientes";
    END IF;
  END IF;

  IF to_regclass('public.clientes') IS NOT NULL THEN
    ALTER TABLE "clientes"
      ADD COLUMN IF NOT EXISTS "cliente_nome" text;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'clientes'
        AND column_name = 'nome'
    ) THEN
      ALTER TABLE "clientes"
        RENAME COLUMN "nome" TO "municipio";
    END IF;

    UPDATE "clientes"
    SET "cliente_nome" = "municipio"
    WHERE "cliente_nome" IS NULL OR btrim("cliente_nome") = '';

    ALTER TABLE "clientes"
      ALTER COLUMN "cliente_nome" SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'municipios_pkey'
      AND conrelid = to_regclass('public.clientes')
  ) THEN
    ALTER TABLE "clientes" RENAME CONSTRAINT "municipios_pkey" TO "clientes_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bases_municipio_id_municipios_id_fk'
      AND conrelid = to_regclass('public.bases')
  ) THEN
    ALTER TABLE "bases" RENAME CONSTRAINT "bases_municipio_id_municipios_id_fk" TO "bases_municipio_id_clientes_id_fk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'propostas_municipio_id_municipios_id_fk'
      AND conrelid = to_regclass('public.propostas')
  ) THEN
    ALTER TABLE "propostas" RENAME CONSTRAINT "propostas_municipio_id_municipios_id_fk" TO "propostas_municipio_id_clientes_id_fk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contratos_municipio_id_municipios_id_fk'
      AND conrelid = to_regclass('public.contratos')
  ) THEN
    ALTER TABLE "contratos" RENAME CONSTRAINT "contratos_municipio_id_municipios_id_fk" TO "contratos_municipio_id_clientes_id_fk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'eventos_municipio_id_municipios_id_fk'
      AND conrelid = to_regclass('public.eventos')
  ) THEN
    ALTER TABLE "eventos" RENAME CONSTRAINT "eventos_municipio_id_municipios_id_fk" TO "eventos_municipio_id_clientes_id_fk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documentos_municipio_id_municipios_id_fk'
      AND conrelid = to_regclass('public.documentos')
  ) THEN
    ALTER TABLE "documentos" RENAME CONSTRAINT "documentos_municipio_id_municipios_id_fk" TO "documentos_municipio_id_clientes_id_fk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pendencias_municipio_id_municipios_id_fk'
      AND conrelid = to_regclass('public.pendencias')
  ) THEN
    ALTER TABLE "pendencias" RENAME CONSTRAINT "pendencias_municipio_id_municipios_id_fk" TO "pendencias_municipio_id_clientes_id_fk";
  END IF;
END $$;
