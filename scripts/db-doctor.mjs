import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const expectedTables = [
  "clientes",
  "bases",
  "modulo_responsaveis",
  "base_modules",
  "propostas",
  "contratos",
  "contrato_modulos",
  "aditivos",
  "eventos",
  "documentos",
  "pendencias",
];

const expectedBaseModuleColumns = [
  "id",
  "base_id",
  "nome",
  "tipo",
  "observacoes",
  "solicitante",
  "solicitacao_at",
  "solicitacao_origem",
  "habilitado_at",
  "migracao_inicio",
  "migracao_fim",
  "implantacao_status",
  "execucao_inicio",
  "desabilitado_at",
  "desabilitado_motivo",
  "desabilitado_justificativa",
  "created_at",
];

const expectedClienteColumns = [
  "id",
  "cliente_nome",
  "municipio",
  "uf",
  "codigo_ibge",
  "populacao",
  "situacao",
  "dados_administrativos",
  "observacoes",
  "created_at",
];

const expectedModuloResponsavelColumns = [
  "id",
  "municipio_id",
  "base_module_id",
  "nome",
  "email",
  "celular",
  "aviso_habilitacao_email",
  "created_at",
];

const expectedDocumentoColumns = [
  "id",
  "municipio_id",
  "base_id",
  "base_module_id",
  "proposta_id",
  "contrato_id",
  "aditivo_id",
  "evento_id",
  "tipo",
  "nome",
  "referencia",
  "storage_key",
  "mime_type",
  "tamanho_bytes",
  "arquivo_nome_original",
  "observacoes",
  "created_at",
];

function safeError(error) {
  return {
    code: error?.code ?? error?.errno ?? "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

const connectionString = process.env.DATABASE_CONNECTION ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(JSON.stringify({ ok: false, status: "missing_connection", error: "DATABASE_CONNECTION is required" }, null, 2));
  process.exit(1);
}

function databasePoolConfig(connection) {
  const parts = connection.split(";");
  if (parts.length === 4 && parts.every(Boolean)) {
    const [hostAndPort, database, user, password] = parts;
    const [host, port] = hostAndPort.split(":");
    return {
      host,
      port: port ? Number(port) : undefined,
      database,
      user,
      password,
    };
  }

  return { connectionString: connection };
}

const pool = new Pool(databasePoolConfig(connectionString));

try {
  const context = await pool.query(
    "select current_database() as database, current_schema() as schema, current_user as user",
  );
  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema = current_schema() and table_name = any($1) order by table_name",
    [expectedTables],
  );
  const columns = await pool.query(
    "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
    ["base_modules"],
  );
  const clienteColumns = await pool.query(
    "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
    ["clientes"],
  );
  const moduloResponsavelColumns = await pool.query(
    "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
    ["modulo_responsaveis"],
  );
  const documentoColumns = await pool.query(
    "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
    ["documentos"],
  );

  const tableNames = tables.rows.map((row) => row.table_name);
  const columnNames = columns.rows.map((row) => row.column_name);
  const clienteColumnNames = clienteColumns.rows.map((row) => row.column_name);
  const moduloResponsavelColumnNames = moduloResponsavelColumns.rows.map((row) => row.column_name);
  const documentoColumnNames = documentoColumns.rows.map((row) => row.column_name);
  const missingTables = expectedTables.filter((table) => !tableNames.includes(table));
  const missingBaseModuleColumns = expectedBaseModuleColumns.filter((column) => !columnNames.includes(column));
  const missingClienteColumns = expectedClienteColumns.filter((column) => !clienteColumnNames.includes(column));
  const missingModuloResponsavelColumns = expectedModuloResponsavelColumns.filter(
    (column) => !moduloResponsavelColumnNames.includes(column),
  );
  const missingDocumentoColumns = expectedDocumentoColumns.filter(
    (column) => !documentoColumnNames.includes(column),
  );
  const ok =
    missingTables.length === 0 &&
    missingBaseModuleColumns.length === 0 &&
    missingClienteColumns.length === 0 &&
    missingModuloResponsavelColumns.length === 0 &&
    missingDocumentoColumns.length === 0;

  console.log(
    JSON.stringify(
      {
        ok,
        status: ok ? "ok" : "schema_mismatch",
        context: context.rows[0],
        foundTables: tableNames,
        missingTables,
        baseModulesColumns: columnNames,
        missingBaseModuleColumns,
        clienteColumns: clienteColumnNames,
        missingClienteColumns,
        moduloResponsaveisColumns: moduloResponsavelColumnNames,
        missingModuloResponsaveisColumns: missingModuloResponsavelColumns,
        documentoColumns: documentoColumnNames,
        missingDocumentoColumns,
      },
      null,
      2,
    ),
  );

  process.exitCode = ok ? 0 : 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, status: "connection_error", error: safeError(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
