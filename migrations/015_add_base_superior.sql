ALTER TABLE "bases"
  ADD COLUMN IF NOT EXISTS "base_superior_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bases_base_superior_id_fkey'
  ) THEN
    ALTER TABLE "bases"
      ADD CONSTRAINT "bases_base_superior_id_fkey"
      FOREIGN KEY ("base_superior_id") REFERENCES "bases"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bases_nao_superior_de_si_mesma'
  ) THEN
    ALTER TABLE "bases"
      ADD CONSTRAINT "bases_nao_superior_de_si_mesma"
      CHECK ("base_superior_id" IS NULL OR "base_superior_id" <> "id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "bases_base_superior_id_idx" ON "bases" ("base_superior_id");
