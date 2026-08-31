ALTER TABLE "documentos"
  ADD COLUMN IF NOT EXISTS "proposta_id" text,
  ADD COLUMN IF NOT EXISTS "storage_key" text,
  ADD COLUMN IF NOT EXISTS "mime_type" text,
  ADD COLUMN IF NOT EXISTS "tamanho_bytes" integer,
  ADD COLUMN IF NOT EXISTS "arquivo_nome_original" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documentos_proposta_id_propostas_id_fk'
      AND conrelid = to_regclass('public.documentos')
  ) THEN
    ALTER TABLE "documentos"
      ADD CONSTRAINT "documentos_proposta_id_propostas_id_fk"
      FOREIGN KEY ("proposta_id") REFERENCES "propostas" ("id");
  END IF;
END $$;
