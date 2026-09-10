import assert from "node:assert/strict";
import test from "node:test";
import {
  documentContentDisposition,
  inlineDocumentMimeType,
  isDocumentViewable,
} from "@/lib/document-view";

test("classifica PDFs, imagens e textos por MIME", () => {
  assert.equal(inlineDocumentMimeType("application/pdf", "arquivo.bin"), "application/pdf");
  assert.equal(inlineDocumentMimeType("IMAGE/JPEG", "foto.bin"), "image/jpeg");
  assert.equal(inlineDocumentMimeType("text/plain; charset=iso-8859-1", "notas.bin"), "text/plain; charset=utf-8");
  assert.equal(inlineDocumentMimeType("text/csv", "dados.bin"), "text/csv; charset=utf-8");
});

test("usa a extensão como fallback para documentos legados sem MIME", () => {
  assert.equal(inlineDocumentMimeType(null, "contrato.PDF"), "application/pdf");
  assert.equal(inlineDocumentMimeType("application/octet-stream", "imagem.webp"), "image/webp");
  assert.equal(inlineDocumentMimeType(null, "dados.csv"), "text/csv; charset=utf-8");
});

test("não libera formatos Office, OpenDocument, RTF ou TIFF", () => {
  for (const fileName of ["texto.docx", "planilha.xlsx", "slides.pptx", "texto.odt", "notas.rtf", "scan.tiff"]) {
    assert.equal(isDocumentViewable(null, fileName), false);
  }
  assert.equal(isDocumentViewable("application/msword", "arquivo.pdf"), false);
});

test("gera Content-Disposition inline seguro e preserva o nome UTF-8", () => {
  const header = documentContentDisposition("inline", 'Contrato "ação".pdf\r\nX-Test: valor');
  assert.match(header, /^inline; filename="Contrato _a_o_.pdf__X-Test: valor";/);
  assert.match(header, /filename\*=UTF-8''Contrato%20%22a%C3%A7%C3%A3o%22.pdf__X-Test%3A%20valor$/);
  assert.equal(header.includes("\r"), false);
  assert.equal(header.includes("\n"), false);
});
