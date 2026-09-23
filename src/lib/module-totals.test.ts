import assert from "node:assert/strict";
import test from "node:test";
import { MODULE_CATALOG } from "./constants";
import { computeActiveModuleCatalogTotals } from "./module-totals";

test("conta cada cadastro ativo e preserva todos os itens na ordem do catálogo", () => {
  const totals = computeActiveModuleCatalogTotals(
    [{ id: "cliente", situacao: "cliente_ativo" }],
    [
      { id: "base-1", municipioId: "cliente", situacao: "ativa" },
      { id: "base-2", municipioId: "cliente", situacao: "ativa" },
    ],
    [
      { baseId: "base-1", nome: "RH", desabilitadoAt: null },
      { baseId: "base-2", nome: " rh ", desabilitadoAt: null },
    ],
  );

  assert.deepEqual(totals.map((item) => item.nome), [...MODULE_CATALOG]);
  assert.equal(totalFor("RH", totals), 2);
  assert.equal(totalFor("Contabilidade", totals), 0);
});

test("exclui módulos desabilitados e os vinculados a bases ou clientes inativos", () => {
  const totals = computeActiveModuleCatalogTotals(
    [
      { id: "ativo", situacao: "cliente_ativo" },
      { id: "inativo", situacao: "cliente_suspenso" },
    ],
    [
      { id: "ativa", municipioId: "ativo", situacao: "ativa" },
      { id: "inativa", municipioId: "ativo", situacao: "inativa" },
      { id: "cliente-inativo", municipioId: "inativo", situacao: "ativa" },
    ],
    [
      { baseId: "ativa", nome: "Portal", desabilitadoAt: null },
      { baseId: "ativa", nome: "Portal", desabilitadoAt: "2026-09-23" },
      { baseId: "inativa", nome: "Portal", desabilitadoAt: null },
      { baseId: "cliente-inativo", nome: "Portal", desabilitadoAt: null },
    ],
  );

  assert.equal(totalFor("Portal", totals), 1);
});

test("normaliza nomes do catálogo e ignora módulos personalizados", () => {
  const totals = computeActiveModuleCatalogTotals(
    [{ id: "cliente", situacao: "cliente_ativo" }],
    [{ id: "base", municipioId: "cliente", situacao: "ativa" }],
    [
      { baseId: "base", nome: "  PATRIMONIO  ", desabilitadoAt: null },
      { baseId: "base", nome: "Módulo personalizado", desabilitadoAt: null },
    ],
  );

  assert.equal(totalFor("Patrimônio", totals), 1);
  assert.equal(totals.reduce((sum, item) => sum + item.total, 0), 1);
});

function totalFor(nome: string, totals: Array<{ nome: string; total: number }>) {
  return totals.find((item) => item.nome === nome)?.total;
}
