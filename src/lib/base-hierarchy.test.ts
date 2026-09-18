import assert from "node:assert/strict";
import test from "node:test";
import { basesMissingModule, parseNewChildBases, validateChildBaseLinks } from "./base-hierarchy";

const parent = { id: "prefeitura", municipioId: "cliente-1", baseSuperiorId: null };
const child = { id: "saude", municipioId: "cliente-1", baseSuperiorId: null };

test("interpreta várias bases inferiores e rejeita cadastros incompletos", () => {
  assert.deepEqual(parseNewChildBases(JSON.stringify([
    { nome: " Saúde ", tipo: "Saúde", cnpj: "12.345.678/0001-90", observacoes: " Equipe A " },
    { nome: "Educação", tipo: "Educação" },
  ])), [
    { nome: "Saúde", tipo: "Saúde", cnpj: "12345678000190", observacoes: "Equipe A" },
    { nome: "Educação", tipo: "Educação", cnpj: null, observacoes: null },
  ]);
  assert.throws(() => parseNewChildBases('[{"tipo":"Saúde"}]'), /nome e tipo/);
});

test("impede relações entre municípios, múltiplos níveis e vínculo já ocupado", () => {
  assert.doesNotThrow(() => validateChildBaseLinks(parent, "cliente-1", [child.id], [], [parent, child]));
  assert.throws(() => validateChildBaseLinks(parent, "cliente-1", ["outro"], [], [parent, { ...child, id: "outro", municipioId: "cliente-2" }]), /bases livres/);
  assert.throws(() => validateChildBaseLinks({ ...child, baseSuperiorId: parent.id }, "cliente-1", [], [{ nome: "Educação", tipo: "Educação", cnpj: null, observacoes: null }], [parent, child]), /base inferior/);
  assert.throws(() => validateChildBaseLinks(parent, "cliente-1", [child.id], [], [parent, { ...child, baseSuperiorId: "outra" }]), /bases livres/);
  assert.doesNotThrow(() => validateChildBaseLinks(parent, "cliente-1", [child.id], [], [parent, { ...child, baseSuperiorId: null }]));
  assert.throws(() => validateChildBaseLinks(parent, "cliente-1", [child.id], [], [parent, child, { id: "neta", municipioId: "cliente-1", baseSuperiorId: child.id }]), /bases livres/);
});

test("replicação preserva módulos existentes e seleciona apenas bases faltantes", () => {
  assert.deepEqual(basesMissingModule([{ id: "saude" }, { id: "educacao" }], [{ baseId: "saude", nome: " PORTAL " }], "Portal"), [{ id: "educacao" }]);
});
