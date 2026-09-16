-- ATENCAO: OPERACAO DESTRUTIVA E IRREVERSIVEL.
-- Este script remove todos os dados de homologacao das tabelas da aplicacao.
-- Execute-o manualmente apenas uma vez, durante a preparacao do banco de producao.
-- Os arquivos armazenados no Cloudflare R2 nao sao removidos por este script.

BEGIN;

TRUNCATE TABLE
  "documentos",
  "eventos",
  "pendencias",
  "modulo_responsaveis",
  "contrato_modulos",
  "aditivos",
  "contratos",
  "propostas",
  "base_modules",
  "bases",
  "clientes";

COMMIT;
