CREATE TABLE IF NOT EXISTS "base_responsaveis" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text NOT NULL,
  "base_id" text NOT NULL,
  "nome" text NOT NULL,
  "email" text NOT NULL,
  "aviso_habilitacao_email" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "base_responsaveis_base_id_unique" UNIQUE ("base_id"),
  CONSTRAINT "base_responsaveis_municipio_id_clientes_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "clientes" ("id"),
  CONSTRAINT "base_responsaveis_base_id_bases_id_fk"
    FOREIGN KEY ("base_id") REFERENCES "bases" ("id")
);
