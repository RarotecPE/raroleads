CREATE TABLE "clients" (
  "id" integer PRIMARY KEY,
  "cnpj" varchar NOT NULL,
  "name" varchar NOT NULL,
  "uf" varchar(2),
  "type" varchar,
  "codigo_ibge" integer,
  "population" integer,
  "created_at" timestamp,
  "state" varchar
);

CREATE TABLE "modules" (
  "id" integer PRIMARY KEY,
  "name" varchar NOT NULL
);

CREATE TABLE "bases" (
  "id" integer PRIMARY KEY,
  "name" varchar NOT NULL
);

CREATE TABLE "clients_bases" (
  "id" integer PRIMARY KEY,
  "clients_id" integer NOT NULL,
  "bases_id" integer NOT NULL,
  "cnpj" varchar NOT NULL,
  "state" varchar,
  "observation" text,
  "date" timestamp
);

CREATE TABLE "client_bases_history" (
  "id" integer PRIMARY KEY,
  "clients_bases_id" integer NOT NULL,
  "state" varchar,
  "observation" text,
  "date" timestamp
);

CREATE TABLE "clients_bases_module" (
  "id" integer PRIMARY KEY,
  "clients_bases_id" integer NOT NULL,
  "modules_id" integer NOT NULL,
  "responsible" varchar,
  "state" varchar,
  "has_contract" bool,
  "module_contract_id" integer,
  "observation" text,
  "date" timestamp
);

CREATE TABLE "clients_bases_module_history" (
  "id" integer PRIMARY KEY,
  "clients_bases_module_id" integer NOT NULL,
  "responsible" varchar,
  "state" varchar,
  "has_contract" bool,
  "module_contract_id" integer,
  "document_id" integer,
  "observation" text,
  "user" varchar,
  "date" timestamp
);

CREATE TABLE "module_contract" (
  "id" integer,
  "clients_bases_module_id" integer UNIQUE,
  "number" integer,
  "initial_date" timestamp,
  "final_date" timestamp,
  "sign_date" timestamp,
  "state" varchar,
  "observation" text,
  "has_amendment" bool,
  "created_at" timestamp,
  PRIMARY KEY ("id", "clients_bases_module_id"),
  UNIQUE ("id")
);

CREATE TABLE "contract_amendment" (
  "id" integer PRIMARY KEY,
  "module_contract_id" integer NOT NULL,
  "type" varchar NOT NULL,
  "date" timestamp
);

CREATE TABLE "documents" (
  "id" integer PRIMARY KEY,
  "clients_bases_module" integer NOT NULL,
  "type" varchar,
  "name" varchar,
  "observation" varchar,
  "created_at" timestamp
);

ALTER TABLE "clients_bases" ADD FOREIGN KEY ("clients_id") REFERENCES "clients" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases" ADD FOREIGN KEY ("bases_id") REFERENCES "bases" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "clients_bases_module_clients_bases" (
  "clients_bases_module_clients_bases_id" integer,
  "clients_bases_id" integer,
  PRIMARY KEY ("clients_bases_module_clients_bases_id", "clients_bases_id")
);

ALTER TABLE "clients_bases_module_clients_bases" ADD FOREIGN KEY ("clients_bases_module_clients_bases_id") REFERENCES "clients_bases_module" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module_clients_bases" ADD FOREIGN KEY ("clients_bases_id") REFERENCES "clients_bases" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module" ADD FOREIGN KEY ("modules_id") REFERENCES "modules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "client_bases_history_clients_bases" (
  "client_bases_history_clients_bases_id" integer,
  "clients_bases_id" integer,
  PRIMARY KEY ("client_bases_history_clients_bases_id", "clients_bases_id")
);

ALTER TABLE "client_bases_history_clients_bases" ADD FOREIGN KEY ("client_bases_history_clients_bases_id") REFERENCES "client_bases_history" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "client_bases_history_clients_bases" ADD FOREIGN KEY ("clients_bases_id") REFERENCES "clients_bases" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "clients_bases_module_history_clients_bases_module" (
  "clients_bases_module_history_clients_bases_module_id" integer,
  "clients_bases_module_id" integer,
  PRIMARY KEY ("clients_bases_module_history_clients_bases_module_id", "clients_bases_module_id")
);

ALTER TABLE "clients_bases_module_history_clients_bases_module" ADD FOREIGN KEY ("clients_bases_module_history_clients_bases_module_id") REFERENCES "clients_bases_module_history" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module_history_clients_bases_module" ADD FOREIGN KEY ("clients_bases_module_id") REFERENCES "clients_bases_module" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module" ADD FOREIGN KEY ("id") REFERENCES "module_contract" ("clients_bases_module_id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "documents_clients_bases_module" (
  "documents_clients_bases_module" integer,
  "clients_bases_module_id" integer,
  PRIMARY KEY ("documents_clients_bases_module", "clients_bases_module_id")
);

ALTER TABLE "documents_clients_bases_module" ADD FOREIGN KEY ("documents_clients_bases_module") REFERENCES "documents" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "documents_clients_bases_module" ADD FOREIGN KEY ("clients_bases_module_id") REFERENCES "clients_bases_module" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module" ADD FOREIGN KEY ("module_contract_id") REFERENCES "module_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "contract_amendment_module_contract" (
  "contract_amendment_module_contract_id" integer,
  "module_contract_id" integer,
  PRIMARY KEY ("contract_amendment_module_contract_id", "module_contract_id")
);

ALTER TABLE "contract_amendment_module_contract" ADD FOREIGN KEY ("contract_amendment_module_contract_id") REFERENCES "contract_amendment" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contract_amendment_module_contract" ADD FOREIGN KEY ("module_contract_id") REFERENCES "module_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;
