import assert from "node:assert/strict";
import test from "node:test";
import { isDocumentShareCancellation, shareDocumentFile, supportsDocumentFileSharing, type DocumentShareApi } from "./document-share";

test("detecta suporte ao compartilhamento de arquivos", () => {
  assert.equal(supportsDocumentFileSharing({ canShare: () => true, share: async () => undefined }), true);
  assert.equal(supportsDocumentFileSharing({ share: async () => undefined }), false);
  assert.equal(supportsDocumentFileSharing({ canShare: () => false, share: async () => undefined }), false);
});

test("busca o documento autenticado e compartilha nome, MIME e conteúdo", async () => {
  let shared: ShareData | undefined;
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const api: DocumentShareApi = {
    canShare: (data) => Boolean(data.files?.length),
    share: async (data) => { shared = data; },
  };
  await shareDocumentFile({
    documentId: "documento 1",
    fileName: "proposta.pdf",
    mimeType: "application/octet-stream",
    api,
    fetcher: async (url, init) => {
      requestedUrl = url;
      requestedInit = init;
      return new Response(new Blob(["conteúdo"], { type: "application/pdf" }), { status: 200 });
    },
  });
  assert.equal(requestedUrl, "/api/documentos/documento%201/download");
  assert.equal(requestedInit?.credentials, "same-origin");
  const file = shared?.files?.[0];
  assert.equal(file?.name, "proposta.pdf");
  assert.equal(file?.type, "application/pdf");
  assert.equal(await file?.text(), "conteúdo");
  assert.equal(shared?.text, "Documento compartilhado pelo Raroclients.");
});

test("rejeita falha HTTP e arquivo não aceito pelo dispositivo", async () => {
  const api: DocumentShareApi = { canShare: () => true, share: async () => undefined };
  await assert.rejects(() => shareDocumentFile({ documentId: "1", fileName: "x.pdf", api, fetcher: async () => new Response(null, { status: 401 }) }), /obter o documento/);
  await assert.rejects(() => shareDocumentFile({ documentId: "1", fileName: "x.pdf", api: { ...api, canShare: () => false }, fetcher: async () => new Response("x") }), /não permite compartilhar/);
});

test("reconhece somente o cancelamento da folha de compartilhamento", () => {
  assert.equal(isDocumentShareCancellation({ name: "AbortError" }), true);
  assert.equal(isDocumentShareCancellation(new Error("falha")), false);
});
