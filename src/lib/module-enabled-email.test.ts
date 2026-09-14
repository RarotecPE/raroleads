import assert from "node:assert/strict";
import test, { mock } from "node:test";
import {
  attemptModuleEnabledEmail,
  buildModuleEnabledEmail,
  canRetryModuleEnabledEmail,
  moduleEnabledRequestOrigin,
  moduleEnabledRequesterEmail,
  needsModuleEnabledEmailPending,
  notifyModuleEnabled,
} from "./module-enabled-email";
import type { RaroNexusEmailPayload } from "./raronexus-email";

const context = {
  moduleId: "module-1",
  moduleName: "Contabilidade",
  baseName: "Prefeitura",
  municipalityId: "customer-1",
  customerName: "Cliente",
  enabledAt: "2026-09-14",
  requesterName: "Ana",
  requesterEmail: "ana@example.com",
  requestOrigin: "WhatsApp",
};

test("aceita ausência completa do solicitante e exige e-mail quando há nome", () => {
  assert.equal(moduleEnabledRequesterEmail(null, null), null);
  assert.equal(moduleEnabledRequesterEmail("", ""), null);
  assert.equal(moduleEnabledRequesterEmail(null, " ana@example.com "), "ana@example.com");
  assert.equal(moduleEnabledRequesterEmail("Ana", "ana@example.com"), "ana@example.com");
  assert.throws(() => moduleEnabledRequesterEmail("Ana", null), /e-mail do solicitante/);
  assert.throws(() => moduleEnabledRequesterEmail(null, "invalido"), /e-mail válido/);
});

test("exige origem quando o nome do solicitante é informado", () => {
  assert.equal(moduleEnabledRequestOrigin(null, null), null);
  assert.equal(moduleEnabledRequestOrigin("", ""), null);
  assert.equal(moduleEnabledRequestOrigin(null, " WhatsApp "), "WhatsApp");
  assert.equal(moduleEnabledRequestOrigin("Ana", "WhatsApp"), "WhatsApp");
  assert.throws(() => moduleEnabledRequestOrigin("Ana", null), /origem da solicitação/);
});

test("gera conteúdo para o solicitante e escapa HTML dinâmico", () => {
  const email = buildModuleEnabledEmail({
    ...context,
    moduleName: "Contabilidade <script>",
    baseName: "Prefeitura & Câmara",
    customerName: "Cliente <Teste>",
    requesterName: "Ana <Admin>",
    requesterEmail: " ana@example.com ",
    requestOrigin: "WhatsApp & E-mail",
  });

  assert.equal(email.to, "ana@example.com");
  assert.equal(email.subject, "Módulo Contabilidade script habilitado");
  assert.match(email.body, /Ana &lt;Admin&gt;/);
  assert.match(email.body, /Prefeitura &amp; Câmara/);
  assert.match(email.body, /Cliente &lt;Teste&gt;/);
  assert.match(email.body, /14\/09\/2026/);
  assert.match(email.body, /conforme solicitado via WhatsApp &amp; E-mail\.<\/p>/);
  assert.equal(email.body.includes("<script>"), false);
  assert.deepEqual(email.metadata, {
    event: "modulo_habilitado",
    module_id: "module-1",
    municipality_id: "customer-1",
    recipient_type: "solicitante",
  });
  assert.equal("responsible_id" in email.metadata, false);
});

test("usa saudação genérica quando apenas o e-mail é informado", () => {
  const email = buildModuleEnabledEmail({ ...context, requesterName: null, requestOrigin: null });
  assert.match(email.body, /Olá, <strong>Solicitante<\/strong>/);
  assert.equal(email.body.includes("conforme solicitado via"), false);
});

test("gera a mensagem completa de habilitação com a origem", () => {
  const email = buildModuleEnabledEmail({
    ...context,
    moduleName: "Portal",
    baseName: "FMS - Paulista",
    customerName: "Paulista",
  });
  assert.match(
    email.body,
    /Informamos que o módulo <strong>Portal<\/strong>, da base <strong>FMS - Paulista<\/strong>, foi habilitado para <strong>Paulista<\/strong> em 14\/09\/2026 conforme solicitado via WhatsApp\./,
  );
});

test("gera pendência somente para habilitação com e-mail ainda não enviado", () => {
  assert.equal(needsModuleEnabledEmailPending({ enabledAt: "2026-09-14", requesterEmail: "ana@example.com", sentAt: null }), true);
  assert.equal(needsModuleEnabledEmailPending({ enabledAt: null, requesterEmail: "ana@example.com", sentAt: null }), false);
  assert.equal(needsModuleEnabledEmailPending({ enabledAt: "2026-09-14", requesterEmail: null, sentAt: null }), false);
  assert.equal(needsModuleEnabledEmailPending({ enabledAt: "2026-09-14", requesterEmail: "ana@example.com", sentAt: new Date() }), false);
});

test("permite reenvio somente para falha pendente e usuário com gestão", () => {
  const pending = { enabledAt: "2026-09-14", requesterEmail: "ana@example.com", sentAt: null };
  assert.equal(canRetryModuleEnabledEmail(pending, false), true);
  assert.equal(canRetryModuleEnabledEmail(pending, true), false);
  assert.equal(canRetryModuleEnabledEmail({ ...pending, enabledAt: null }, false), false);
  assert.equal(canRetryModuleEnabledEmail({ ...pending, requesterEmail: null }, false), false);
  assert.equal(canRetryModuleEnabledEmail({ ...pending, sentAt: new Date() }, false), false);
});

test("envia exatamente uma notificação ao solicitante", async () => {
  const sendEmail = mock.fn(async (_payload: RaroNexusEmailPayload) => ({ sent: true as const, messageId: "message-1" }));
  const result = await notifyModuleEnabled(context, sendEmail);

  assert.deepEqual(result, { sent: true, messageId: "message-1" });
  assert.equal(sendEmail.mock.callCount(), 1);
  assert.equal(sendEmail.mock.calls[0].arguments[0].to, "ana@example.com");
});

test("informa falha sem propagá-la para o fluxo de habilitação ou reenvio", async () => {
  const sendEmail = mock.fn(async (_payload: RaroNexusEmailPayload) => {
    throw new Error("Falha simulada");
  });

  assert.equal(await attemptModuleEnabledEmail(context, sendEmail), false);
  assert.equal(sendEmail.mock.callCount(), 1);
});
