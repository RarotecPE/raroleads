import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORIZED_ROLES,
  canManage,
  canView,
  isAuthorizedRole,
  permissionsForRole,
  ROLE_LABELS,
} from "./auth-permissions";

test("somente usuario e gestor sao papeis autorizados", () => {
  assert.deepEqual(AUTHORIZED_ROLES, ["usuario", "gestor"]);
  assert.equal(isAuthorizedRole("usuario"), true);
  assert.equal(isAuthorizedRole("gestor"), true);
  assert.equal(isAuthorizedRole("admin"), false);
  assert.equal(isAuthorizedRole("visualizador"), false);
  assert.equal(isAuthorizedRole("desconhecido"), false);
});

test("usuario possui acesso somente de leitura", () => {
  const permissions = permissionsForRole("usuario");
  assert.equal(canView(permissions), true);
  assert.equal(canManage(permissions), false);
  assert.equal(ROLE_LABELS.usuario, "Usuário");
});

test("gestor possui acesso de leitura e escrita", () => {
  const permissions = permissionsForRole("gestor");
  assert.equal(canView(permissions), true);
  assert.equal(canManage(permissions), true);
  assert.equal(ROLE_LABELS.gestor, "Gestor");
});
