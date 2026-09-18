import assert from "node:assert/strict";
import test from "node:test";
import { MODULE_CATALOG } from "./constants";
import { computeOportunidades } from "./opportunities";

test("identifica oportunidades em clientes de qualquer situação, inclusive sem módulos", () => {
  const clientes = [
    { id: "ativo", situacao: "cliente_ativo" },
    { id: "prospect", situacao: "prospect" },
    { id: "suspenso", situacao: "cliente_suspenso" },
  ];
  const bases = [{ id: "b1", municipioId: "ativo" }, { id: "b2", municipioId: "prospect" }];
  const oportunidades = computeOportunidades(clientes, bases, [{ baseId: "b1", nome: "Contabilidade" }]);
  assert.equal(oportunidades.length, 3);
  assert.equal(oportunidades.find((item) => item.municipio.id === "prospect")?.missing.length, MODULE_CATALOG.length);
  assert.equal(oportunidades.find((item) => item.municipio.id === "suspenso")?.missing.length, MODULE_CATALOG.length);
  assert.equal(oportunidades.find((item) => item.municipio.id === "ativo")?.missing.includes("Contabilidade"), false);
});

test("considera todas as bases do mesmo cliente e não mistura clientes", () => {
  const oportunidades = computeOportunidades(
    [{ id: "a" }, { id: "b" }],
    [{ id: "a1", municipioId: "a" }, { id: "a2", municipioId: "a" }, { id: "b1", municipioId: "b" }],
    [{ baseId: "a1", nome: "  CONTABILIDADE " }, { baseId: "a2", nome: "rh" }, { baseId: "b1", nome: "Portal" }],
  );
  assert.deepEqual(opportunitiesFor("a", oportunidades).filter((item) => ["Contabilidade", "RH"].includes(item)), []);
  assert.equal(opportunitiesFor("b", oportunidades).includes("Contabilidade"), true);
});

test("não gera aviso para cliente que já possui todo o catálogo", () => {
  const oportunidades = computeOportunidades(
    [{ id: "completo" }],
    [{ id: "base", municipioId: "completo" }],
    MODULE_CATALOG.map((nome) => ({ baseId: "base", nome })),
  );
  assert.deepEqual(oportunidades, []);
});

function opportunitiesFor<T extends { id: string }>(id: string, oportunidades: { municipio: T; missing: string[] }[]) {
  return oportunidades.find((item) => item.municipio.id === id)?.missing ?? [];
}
