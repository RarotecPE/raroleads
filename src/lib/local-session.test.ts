import assert from "node:assert/strict";
import test from "node:test";
import type { AppSession } from "./auth-types";
import { createLocalSessionToken, LOCAL_SESSION_MAX_AGE, verifyLocalSessionToken } from "./local-session";

const secret = "test-secret";
const now = Date.UTC(2026, 8, 11, 12, 0, 0);
const session: AppSession = {
  role: "gestor",
  roleLabel: "Gestor",
  user: { id: "user-1", nome: "Pessoa Gestora", email: "gestor@example.com" },
  permissions: { view: true, manage: true },
};

test("cria e valida uma sessao local assinada", () => {
  const token = createLocalSessionToken(session, secret, now);
  assert.deepEqual(verifyLocalSessionToken(token, secret, now), session);
});

test("rejeita sessao expirada", () => {
  const token = createLocalSessionToken(session, secret, now);
  const expiredAt = now + LOCAL_SESSION_MAX_AGE * 1000;
  assert.equal(verifyLocalSessionToken(token, secret, expiredAt), null);
});

test("rejeita assinatura adulterada", () => {
  const token = createLocalSessionToken(session, secret, now);
  const [payload] = token.split(".");
  assert.equal(verifyLocalSessionToken(`${payload}.invalid`, secret, now), null);
});

test("rejeita papel nao autorizado mesmo com assinatura valida", () => {
  const unauthorized = { ...session, role: "admin" as AppSession["role"] };
  const token = createLocalSessionToken(unauthorized, secret, now);
  assert.equal(verifyLocalSessionToken(token, secret, now), null);
});
