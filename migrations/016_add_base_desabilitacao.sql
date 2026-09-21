ALTER TABLE "bases"
  ADD COLUMN IF NOT EXISTS "desabilitado_at" date,
  ADD COLUMN IF NOT EXISTS "desabilitado_motivo" text,
  ADD COLUMN IF NOT EXISTS "desabilitacao_origem_base_id" text;

ALTER TABLE "base_modules"
  ADD COLUMN IF NOT EXISTS "desabilitacao_origem_base_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bases_desabilitacao_origem_base_id_fkey'
  ) THEN
    ALTER TABLE "bases"
      ADD CONSTRAINT "bases_desabilitacao_origem_base_id_fkey"
      FOREIGN KEY ("desabilitacao_origem_base_id") REFERENCES "bases"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'base_modules_desabilitacao_origem_base_id_fkey'
  ) THEN
    ALTER TABLE "base_modules"
      ADD CONSTRAINT "base_modules_desabilitacao_origem_base_id_fkey"
      FOREIGN KEY ("desabilitacao_origem_base_id") REFERENCES "bases"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "bases_desabilitacao_origem_base_id_idx"
  ON "bases" ("desabilitacao_origem_base_id");

CREATE INDEX IF NOT EXISTS "base_modules_desabilitacao_origem_base_id_idx"
  ON "base_modules" ("desabilitacao_origem_base_id");
