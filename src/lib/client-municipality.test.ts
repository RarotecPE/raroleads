import assert from "node:assert/strict";
import test from "node:test";
import { assertClientMunicipalityUnchanged, findDuplicateMunicipalityClients } from "./client-municipality";

const clients = [
  { id: "carpina", municipio: "Carpina", uf: "PE", codigoIbge: "2604007" },
  { id: "legado", municipio: "São José", uf: "PE", codigoIbge: null },
  { id: "outro", municipio: "Carpina", uf: "PB", codigoIbge: null },
];

test("identifica município cadastrado prioritariamente pelo código IBGE", () => {
  assert.deepEqual(findDuplicateMunicipalityClients({ municipio: "Nome divergente", uf: "PE", codigoIbge: "2604007" }, clients).map((client) => client.id), ["carpina"]);
});

test("identifica cadastro legado por município e UF normalizados", () => {
  assert.deepEqual(findDuplicateMunicipalityClients({ municipio: " sao jose ", uf: "pe", codigoIbge: "2610000" }, clients).map((client) => client.id), ["legado"]);
  assert.deepEqual(findDuplicateMunicipalityClients({ municipio: "Carpina", uf: "PE", codigoIbge: null }, clients).map((client) => client.id), ["carpina"]);
});

test("mantém município, UF e código IBGE imutáveis na edição", () => {
  const identity = { municipio: "Carpina", uf: "PE", codigoIbge: "2604007" };
  assert.doesNotThrow(() => assertClientMunicipalityUnchanged(identity, { ...identity }));
  assert.throws(() => assertClientMunicipalityUnchanged(identity, { ...identity, municipio: "Recife" }), /não pode ser alterado/);
  assert.throws(() => assertClientMunicipalityUnchanged(identity, { ...identity, uf: "PB" }), /não pode ser alterado/);
  assert.throws(() => assertClientMunicipalityUnchanged(identity, { ...identity, codigoIbge: "2611606" }), /não pode ser alterado/);
});
