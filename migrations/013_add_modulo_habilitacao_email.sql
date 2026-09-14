ALTER TABLE "base_modules"
  ADD COLUMN IF NOT EXISTS "solicitante_email" text,
  ADD COLUMN IF NOT EXISTS "habilitacao_email_enviado_at" timestamp;
