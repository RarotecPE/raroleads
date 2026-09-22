ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS cancelada_at timestamp,
  ADD COLUMN IF NOT EXISTS cancelada_por text,
  ADD COLUMN IF NOT EXISTS cancelamento_motivo text,
  ADD COLUMN IF NOT EXISTS excluida_at timestamp,
  ADD COLUMN IF NOT EXISTS excluida_por text;
