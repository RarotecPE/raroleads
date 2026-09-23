import assert from "node:assert/strict";
import test, { afterEach, beforeEach, mock } from "node:test";
import { sendRaroNexusEmail } from "./raronexus-email";

const originalEnv = {
  baseUrl: process.env.RARONEXUS_BASE_URL,
  clientId: process.env.RARONEXUS_CLIENT_ID,
  clientSecret: process.env.RARONEXUS_CLIENT_SECRET,
};

beforeEach(() => {
  process.env.RARONEXUS_BASE_URL = "https://nexus.example.com/base/";
  process.env.RARONEXUS_CLIENT_ID = "raroclients";
  process.env.RARONEXUS_CLIENT_SECRET = "test-secret";
});

afterEach(() => {
  mock.restoreAll();
  for (const [name, value] of Object.entries({
    RARONEXUS_BASE_URL: originalEnv.baseUrl,
    RARONEXUS_CLIENT_ID: originalEnv.clientId,
    RARONEXUS_CLIENT_SECRET: originalEnv.clientSecret,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("envia body HTML de teste para o endpoint de habilitação", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = input.toString();
    capturedInit = init;
    return Response.json({ success: true, data: { sent: true, message_id: "message-1" } });
  });

  const payload = {
    to: "responsavel@example.com",
    subject: "Teste de habilitação",
    body: "<p>Body de teste da habilitação.</p>",
    metadata: { event: "modulo_habilitado" },
  };

  const result = await sendRaroNexusEmail(payload);

  assert.equal(capturedUrl, "https://nexus.example.com/api/email/modulo-habilitado");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.cache, "no-store");
  assert.deepEqual(capturedInit?.headers, {
    "Content-Type": "application/json",
    "X-RaroNexus-Client-Id": "raroclients",
    "X-RaroNexus-Client-Secret": "test-secret",
  });
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), payload);
  assert.deepEqual(result, { sent: true, messageId: "message-1" });
});

test("rejeita resposta HTTP sem sucesso", async () => {
  mock.method(console, "warn", () => undefined);
  mock.method(globalThis, "fetch", async () => Response.json(
    { success: false, message: "Endpoint não liberado." },
    { status: 403 },
  ));

  await assert.rejects(
    sendRaroNexusEmail({ to: "a@example.com", subject: "Teste", body: "<p>Teste</p>" }),
    /Endpoint não liberado/,
  );
});

test("rejeita resposta de sucesso sem JSON válido", async () => {
  mock.method(console, "warn", () => undefined);
  mock.method(globalThis, "fetch", async () => new Response("not-json", { status: 200 }));

  await assert.rejects(
    sendRaroNexusEmail({ to: "a@example.com", subject: "Teste", body: "<p>Teste</p>" }),
    /resposta inválida/,
  );
});

test("propaga falha de rede", async () => {
  mock.method(console, "error", () => undefined);
  mock.method(globalThis, "fetch", async () => {
    throw new Error("network unavailable");
  });

  await assert.rejects(
    sendRaroNexusEmail({ to: "a@example.com", subject: "Teste", body: "<p>Teste</p>" }),
    /network unavailable/,
  );
});

test("rejeita configuração ausente antes do envio", async () => {
  delete process.env.RARONEXUS_CLIENT_SECRET;
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({}));

  await assert.rejects(
    sendRaroNexusEmail({ to: "a@example.com", subject: "Teste", body: "<p>Teste</p>" }),
    /RARONEXUS_CLIENT_SECRET is required/,
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});
