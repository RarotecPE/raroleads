ALTER TABLE "eventos"
  ADD COLUMN IF NOT EXISTS "aditivo_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_aditivo_id_aditivos_id_fk'
      AND conrelid = to_regclass('public.eventos')
  ) THEN
    ALTER TABLE "eventos"
      ADD CONSTRAINT "eventos_aditivo_id_aditivos_id_fk"
      FOREIGN KEY ("aditivo_id") REFERENCES "aditivos" ("id");
  END IF;
END $$;
