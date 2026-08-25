CREATE TABLE "clients" (
  "id" intenger PRIMARY KEY,
  "cnpj" varchar NOT NULL,
  "name" varchar NOT NULL,
  "uf" varchar(2),
  "type" varchar,
  "codigo_ibge" intenger,
  "population" integer,
  "created_at" timestamp,
  "state" varchar
);

CREATE TABLE "modules" (
  "id" intenger PRIMARY KEY,
  "name" varchar NOT NULL
);

CREATE TABLE "bases" (
  "id" intenger PRIMARY KEY,
  "name" varchar NOT NULL
);

CREATE TABLE "clients_bases" (
  "id" intenger NOT NULL,
  "clients_id" intenger NOT NULL,
  "bases_id" intenger NOT NULL,
  "cnpj" varchar NOT NULL,
  "state" varchar,
  "observation" text,
  "date" datetime
);

CREATE TABLE "client_bases_history" (
  "id" intenger NOT NULL,
  "clients_bases_id" intenger NOT NULL,
  "state" varchar,
  "observation" text,
  "date" datetime
);

CREATE TABLE "clients_bases_module" (
  "id" intenger NOT NULL,
  "clients_bases_id" intenger NOT NULL,
  "modules_id" intenger NOT NULL,
  "responsible" varchar,
  "state" varchar,
  "has_contract" bool,
  "module_contract_id" intenger,
  "observation" text,
  "date" datetime
);

CREATE TABLE "clients_bases_module_history" (
  "id" intenger NOT NULL,
  "clients_bases_module_id" intenger NOT NULL,
  "responsible" varchar,
  "state" varchar,
  "has_contract" bool,
  "module_contract_id" intenger,
  "document_id" integer,
  "observation" text,
  "user" varchar,
  "date" datetime
);

CREATE TABLE "module_contract" (
  "id" intenger,
  "clients_bases_module_id" intenger,
  "number" intenger,
  "initial_date" datetime,
  "final_date" datetime,
  "sign_date" datetime,
  "state" varchar,
  "observation" text,
  "has_amendment" bool,
  "created_at" datetime,
  PRIMARY KEY ("id", "clients_bases_module_id")
);

CREATE TABLE "contract_amendment" (
  "id" intenger PRIMARY KEY,
  "module_contract_id" intenger NOT NULL,
  "type" varchar NOT NULL,
  "date" datetime
);

CREATE TABLE "documents" (
  "id" intenger PRIMARY KEY,
  "clients_bases_module" intenger NOT NULL,
  "type" varchar,
  "name" varchar,
  "observation" varchar,
  "created_at" datetime
);

ALTER TABLE "clients_bases" ADD FOREIGN KEY ("clients_id") REFERENCES "clients" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases" ADD FOREIGN KEY ("bases_id") REFERENCES "bases" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "clients_bases_module_clients_bases" (
  "clients_bases_module_clients_bases_id" intenger,
  "clients_bases_id" intenger,
  PRIMARY KEY ("clients_bases_module_clients_bases_id", "clients_bases_id")
);

ALTER TABLE "clients_bases_module_clients_bases" ADD FOREIGN KEY ("clients_bases_module_clients_bases_id") REFERENCES "clients_bases_module" ("clients_bases_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module_clients_bases" ADD FOREIGN KEY ("clients_bases_id") REFERENCES "clients_bases" ("id") DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE "clients_bases_module" ADD FOREIGN KEY ("modules_id") REFERENCES "modules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "client_bases_history_clients_bases" (
  "client_bases_history_clients_bases_id" intenger,
  "clients_bases_id" intenger,
  PRIMARY KEY ("client_bases_history_clients_bases_id", "clients_bases_id")
);

ALTER TABLE "client_bases_history_clients_bases" ADD FOREIGN KEY ("client_bases_history_clients_bases_id") REFERENCES "client_bases_history" ("clients_bases_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "client_bases_history_clients_bases" ADD FOREIGN KEY ("clients_bases_id") REFERENCES "clients_bases" ("id") DEFERRABLE INITIALLY IMMEDIATE;


CREATE TABLE "clients_bases_module_history_clients_bases_module" (
  "clients_bases_module_history_clients_bases_module_id" intenger,
  "clients_bases_module_id" intenger,
  PRIMARY KEY ("clients_bases_module_history_clients_bases_module_id", "clients_bases_module_id")
);

ALTER TABLE "clients_bases_module_history_clients_bases_module" ADD FOREIGN KEY ("clients_bases_module_history_clients_bases_module_id") REFERENCES "clients_bases_module_history" ("clients_bases_module_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "clients_bases_module_history_clients_bases_module" ADD FOREIGN KEY ("clients_bases_module_id") REFERENCES "clients_bases_module" ("id") DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE "clients_bases_module" ADD FOREIGN KEY ("id") REFERENCES "module_contract" ("clients_bases_module_id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "documents_clients_bases_module" (
  "documents_clients_bases_module" intenger,
  "clients_bases_module_id" intenger,
  PRIMARY KEY ("documents_clients_bases_module", "clients_bases_module_id")
);

ALTER TABLE "documents_clients_bases_module" ADD FOREIGN KEY ("documents_clients_bases_module") REFERENCES "documents" ("clients_bases_module") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "documents_clients_bases_module" ADD FOREIGN KEY ("clients_bases_module_id") REFERENCES "clients_bases_module" ("id") DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE "clients_bases_module" ADD FOREIGN KEY ("module_contract_id") REFERENCES "module_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE "contract_amendment_module_contract" (
  "contract_amendment_module_contract_id" intenger,
  "module_contract_id" intenger,
  PRIMARY KEY ("contract_amendment_module_contract_id", "module_contract_id")
);

ALTER TABLE "contract_amendment_module_contract" ADD FOREIGN KEY ("contract_amendment_module_contract_id") REFERENCES "contract_amendment" ("module_contract_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contract_amendment_module_contract" ADD FOREIGN KEY ("module_contract_id") REFERENCES "module_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;
