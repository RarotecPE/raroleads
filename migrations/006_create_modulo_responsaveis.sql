DROP TABLE IF EXISTS "base_responsaveis";

CREATE TABLE IF NOT EXISTS "modulo_responsaveis" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "municipio_id" text NOT NULL,
  "base_module_id" text NOT NULL,
  "nome" text NOT NULL,
  "email" text,
  "celular" text,
  "aviso_habilitacao_email" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "modulo_responsaveis_municipio_id_clientes_id_fk"
    FOREIGN KEY ("municipio_id") REFERENCES "clientes" ("id"),
  CONSTRAINT "modulo_responsaveis_base_module_id_base_modules_id_fk"
    FOREIGN KEY ("base_module_id") REFERENCES "base_modules" ("id") ON DELETE CASCADE
);
