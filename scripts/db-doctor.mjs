import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const expectedTables = [
  "clientes",
  "bases",
  "base_responsaveis",
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

const expectedBaseResponsavelColumns = [
  "id",
  "municipio_id",
  "base_id",
  "nome",
  "email",
  "aviso_habilitacao_email",
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
  const baseResponsavelColumns = await pool.query(
    "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
    ["base_responsaveis"],
  );

  const tableNames = tables.rows.map((row) => row.table_name);
  const columnNames = columns.rows.map((row) => row.column_name);
  const clienteColumnNames = clienteColumns.rows.map((row) => row.column_name);
  const baseResponsavelColumnNames = baseResponsavelColumns.rows.map((row) => row.column_name);
  const missingTables = expectedTables.filter((table) => !tableNames.includes(table));
  const missingBaseModuleColumns = expectedBaseModuleColumns.filter((column) => !columnNames.includes(column));
  const missingClienteColumns = expectedClienteColumns.filter((column) => !clienteColumnNames.includes(column));
  const missingBaseResponsavelColumns = expectedBaseResponsavelColumns.filter(
    (column) => !baseResponsavelColumnNames.includes(column),
  );
  const ok =
    missingTables.length === 0 &&
    missingBaseModuleColumns.length === 0 &&
    missingClienteColumns.length === 0 &&
    missingBaseResponsavelColumns.length === 0;

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
        baseResponsaveisColumns: baseResponsavelColumnNames,
        missingBaseResponsaveisColumns: missingBaseResponsavelColumns,
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
