import assert from "node:assert/strict";
import test from "node:test";
import { eligibleAditivoModules } from "@/lib/aditivo-modules";
import {
  ADITIVO_TIPO_EXCLUSAO_MODULO,
  ADITIVO_TIPO_INCLUSAO_MODULO,
} from "@/lib/constants";

const modulos = [
  { id: "contabilidade", baseId: "prefeitura", nome: "Contabilidade" },
  { id: "tributos", baseId: "prefeitura", nome: "Tributos" },
  { id: "saude", baseId: "secretaria-saude", nome: "Saúde" },
];

test("aditivo de inclusão oferece apenas módulos ainda não vinculados", () => {
  const elegiveis = eligibleAditivoModules(ADITIVO_TIPO_INCLUSAO_MODULO, modulos, ["contabilidade"]);
  assert.deepEqual(elegiveis.map((modulo) => modulo.id), ["tributos", "saude"]);
});

test("aditivo de exclusão oferece apenas módulos vinculados", () => {
  const elegiveis = eligibleAditivoModules(ADITIVO_TIPO_EXCLUSAO_MODULO, modulos, ["contabilidade", "saude"]);
  assert.deepEqual(elegiveis.map((modulo) => modulo.id), ["contabilidade", "saude"]);
});

test("outros tipos de aditivo não oferecem alteração de módulos", () => {
  assert.deepEqual(eligibleAditivoModules("Alteração de valor", modulos, ["contabilidade"]), []);
});
