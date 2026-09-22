ALTER TABLE proposta_bases
  ADD COLUMN IF NOT EXISTS forcar_criacao_duplicada boolean NOT NULL DEFAULT false;
