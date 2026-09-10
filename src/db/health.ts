import { pool } from "@/db";

const EXPECTED_TABLES = [
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
] as const;

const EXPECTED_BASE_MODULE_COLUMNS = [
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
] as const;

const EXPECTED_CLIENTE_COLUMNS = [
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
] as const;

const EXPECTED_MODULO_RESPONSAVEL_COLUMNS = [
  "id",
  "municipio_id",
  "base_module_id",
  "nome",
  "email",
  "celular",
  "aviso_habilitacao_email",
  "created_at",
] as const;

const EXPECTED_DOCUMENTO_COLUMNS = [
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
] as const;

const EXPECTED_ADITIVO_COLUMNS = [
  "id",
  "contrato_id",
  "tipo",
  "data",
  "descricao",
  "nova_data_fim",
  "created_at",
] as const;

const EXPECTED_EVENTO_COLUMNS = [
  "id",
  "municipio_id",
  "base_id",
  "base_module_id",
  "contrato_id",
  "aditivo_id",
  "tipo",
  "descricao",
  "data",
  "usuario",
  "created_at",
] as const;

export type DatabaseHealth =
  | {
      ok: true;
      status: "ok";
      context: {
        database: string;
        schema: string;
        user: string;
      };
    }
  | {
      ok: false;
      status: "schema_mismatch";
      context: {
        database: string;
        schema: string;
        user: string;
      };
      missingTables: string[];
      missingBaseModuleColumns: string[];
      missingClienteColumns: string[];
      missingModuloResponsavelColumns: string[];
      missingDocumentoColumns: string[];
      missingAditivoColumns: string[];
      missingEventoColumns: string[];
    }
  | {
      ok: false;
      status: "connection_error";
      error: {
        code: string;
        message: string;
      };
    };

function safeError(error: unknown) {
  const err = error as { code?: string; errno?: string };
  return {
    code: err.code ?? err.errno ?? "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const context = await pool.query<{
      database: string;
      schema: string;
      user: string;
    }>("select current_database() as database, current_schema() as schema, current_user as user");
    const tables = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = current_schema() and table_name = any($1) order by table_name",
      [EXPECTED_TABLES],
    );
    const columns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      ["base_modules"],
    );
    const clienteColumns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      ["clientes"],
    );
    const moduloResponsavelColumns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      ["modulo_responsaveis"],
    );
    const documentoColumns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      ["documentos"],
    );
    const aditivoColumns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      ["aditivos"],
    );
    const eventoColumns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      ["eventos"],
    );

    const tableNames = tables.rows.map((row) => row.table_name);
    const columnNames = columns.rows.map((row) => row.column_name);
    const clienteColumnNames = clienteColumns.rows.map((row) => row.column_name);
    const moduloResponsavelColumnNames = moduloResponsavelColumns.rows.map((row) => row.column_name);
    const documentoColumnNames = documentoColumns.rows.map((row) => row.column_name);
    const aditivoColumnNames = aditivoColumns.rows.map((row) => row.column_name);
    const eventoColumnNames = eventoColumns.rows.map((row) => row.column_name);
    const missingTables = EXPECTED_TABLES.filter((table) => !tableNames.includes(table));
    const missingBaseModuleColumns = EXPECTED_BASE_MODULE_COLUMNS.filter((column) => !columnNames.includes(column));
    const missingClienteColumns = EXPECTED_CLIENTE_COLUMNS.filter((column) => !clienteColumnNames.includes(column));
    const missingModuloResponsavelColumns = EXPECTED_MODULO_RESPONSAVEL_COLUMNS.filter(
      (column) => !moduloResponsavelColumnNames.includes(column),
    );
    const missingDocumentoColumns = EXPECTED_DOCUMENTO_COLUMNS.filter(
      (column) => !documentoColumnNames.includes(column),
    );
    const missingAditivoColumns = EXPECTED_ADITIVO_COLUMNS.filter((column) => !aditivoColumnNames.includes(column));
    const missingEventoColumns = EXPECTED_EVENTO_COLUMNS.filter((column) => !eventoColumnNames.includes(column));

    if (
      missingTables.length > 0 ||
      missingBaseModuleColumns.length > 0 ||
      missingClienteColumns.length > 0 ||
      missingModuloResponsavelColumns.length > 0 ||
      missingDocumentoColumns.length > 0 ||
      missingAditivoColumns.length > 0 ||
      missingEventoColumns.length > 0
    ) {
      return {
        ok: false,
        status: "schema_mismatch",
        context: context.rows[0],
        missingTables,
        missingBaseModuleColumns,
        missingClienteColumns,
        missingModuloResponsavelColumns,
        missingDocumentoColumns,
        missingAditivoColumns,
        missingEventoColumns,
      };
    }

    return {
      ok: true,
      status: "ok",
      context: context.rows[0],
    };
  } catch (error) {
    return {
      ok: false,
      status: "connection_error",
      error: safeError(error),
    };
  }
}
