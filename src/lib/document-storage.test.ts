import assert from "node:assert/strict";
import test from "node:test";
import { documentStoragePrefix } from "./document-storage";

test("usa Raroclients como prefixo padrão e respeita a configuração do R2", () => {
  const previousPrefix = process.env.R2_BASE_PREFIX;

  try {
    delete process.env.R2_BASE_PREFIX;
    assert.equal(documentStoragePrefix(), "raroclients");

    process.env.R2_BASE_PREFIX = "/documentos-personalizados/";
    assert.equal(documentStoragePrefix(), "documentos-personalizados");
  } finally {
    if (previousPrefix === undefined) delete process.env.R2_BASE_PREFIX;
    else process.env.R2_BASE_PREFIX = previousPrefix;
  }
});
