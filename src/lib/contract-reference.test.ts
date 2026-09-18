import assert from "node:assert/strict";
import test from "node:test";
import {
  contractedModuleIds,
  documentTypeForContext,
  isContractDocumentType,
  occupiedBaseIds,
  validateBaseAvailability,
  validateContractModuleSelection,
} from "./contract-reference";

test("contrato exige módulo e rejeita módulos ausentes ou de outro cliente", () => {
  assert.throws(() => validateContractModuleSelection([], [], ["base-1"]), /ao menos um módulo/);
  assert.throws(() => validateContractModuleSelection(["mod-1"], [], ["base-1"]), /este cliente/);
  assert.throws(() => validateContractModuleSelection(["mod-1"], [{ id: "mod-1", baseId: "base-2" }], ["base-1"]), /este cliente/);
  assert.doesNotThrow(() => validateContractModuleSelection(["mod-1"], [{ id: "mod-1", baseId: "base-1" }], ["base-1"]));
});

test("anexos ligados a contrato recebem tipo fixo e variantes antigas continuam reconhecidas", () => {
  assert.equal(documentTypeForContext("contrato-1", "Ata"), "Contrato");
  assert.equal(documentTypeForContext(null, "Ata"), "Ata");
  assert.equal(isContractDocumentType("Contrato"), true);
  assert.equal(isContractDocumentType("contrato_assinado"), true);
  assert.equal(isContractDocumentType("Contrato sem assinatura"), true);
  assert.equal(isContractDocumentType("Ata"), false);
});

test("cobertura considera todos os vínculos sem depender do status legado", () => {
  assert.deepEqual(contractedModuleIds([
    { baseModuleId: "mod-1" },
    { baseModuleId: "mod-2" },
    { baseModuleId: "mod-1" },
  ]), new Set(["mod-1", "mod-2"]));
});

test("base ocupada não pode ser vinculada a outro contrato até a desvinculação", () => {
  const modules = [{ id: "mod-1", baseId: "base-1" }, { id: "mod-2", baseId: "base-1" }];
  const links = [{ baseModuleId: "mod-1", contratoId: "contrato-1" }];
  assert.deepEqual(occupiedBaseIds(links, modules), new Set(["base-1"]));
  assert.throws(
    () => validateBaseAvailability(["base-1"], [{ baseId: "base-1", contratoId: "contrato-1" }], "contrato-2"),
    /já está vinculada/,
  );
  assert.doesNotThrow(() => validateBaseAvailability(["base-1"], [{ baseId: "base-1", contratoId: "contrato-1" }], "contrato-1"));
  assert.doesNotThrow(() => validateBaseAvailability(["base-1"], [], "contrato-2"));
});
