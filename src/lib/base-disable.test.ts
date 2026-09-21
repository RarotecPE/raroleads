import assert from "node:assert/strict";
import test from "node:test";
import { planBaseDisable, planBaseReactivation } from "./base-disable";

const bases = [
  { id: "root", baseSuperiorId: null, situacao: "ativa", desabilitacaoOrigemBaseId: null },
  { id: "child-active", baseSuperiorId: "root", situacao: "ativa", desabilitacaoOrigemBaseId: null },
  { id: "child-inactive", baseSuperiorId: "root", situacao: "inativa", desabilitacaoOrigemBaseId: "other" },
  { id: "unrelated", baseSuperiorId: null, situacao: "ativa", desabilitacaoOrigemBaseId: null },
];

const modules = [
  { id: "root-active", baseId: "root", desabilitadoAt: null, desabilitacaoOrigemBaseId: null },
  { id: "root-disabled", baseId: "root", desabilitadoAt: "2026-01-01", desabilitacaoOrigemBaseId: null },
  { id: "child-active", baseId: "child-active", desabilitadoAt: null, desabilitacaoOrigemBaseId: null },
  { id: "inactive-child-active", baseId: "child-inactive", desabilitadoAt: null, desabilitacaoOrigemBaseId: null },
  { id: "unrelated", baseId: "unrelated", desabilitadoAt: null, desabilitacaoOrigemBaseId: null },
];

test("planeja a cascata direta sem sobrescrever estados anteriores", () => {
  const plan = planBaseDisable("root", bases, modules);
  assert.deepEqual(plan.scopeBaseIds, ["root", "child-active", "child-inactive"]);
  assert.deepEqual(plan.baseIdsToDisable, ["root", "child-active"]);
  assert.deepEqual(plan.moduleIdsToDisable, ["root-active", "child-active", "inactive-child-active"]);
});

test("reativa somente registros marcados pela base originadora", () => {
  const plan = planBaseReactivation(
    "root",
    bases.map((base) => base.id === "root" || base.id === "child-active"
      ? { ...base, situacao: "inativa", desabilitacaoOrigemBaseId: "root" }
      : base),
    modules.map((module) => module.id === "root-active" || module.id === "child-active"
      ? { ...module, desabilitadoAt: "2026-09-21", desabilitacaoOrigemBaseId: "root" }
      : module),
  );
  assert.deepEqual(plan.baseIdsToReactivate, ["root", "child-active"]);
  assert.deepEqual(plan.moduleIdsToReactivate, ["root-active", "child-active"]);
});

test("impede reativacao por uma base inferior da cascata", () => {
  assert.throws(
    () => planBaseReactivation(
      "child-active",
      bases.map((base) => base.id === "child-active" ? { ...base, desabilitacaoOrigemBaseId: "root" } : base),
      modules,
    ),
    /base que originou/,
  );
});
