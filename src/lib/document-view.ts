const VIEWABLE_MIME_TYPES = new Map<string, string>([
  ["application/pdf", "application/pdf"],
  ["image/png", "image/png"],
  ["image/jpeg", "image/jpeg"],
  ["image/jpg", "image/jpeg"],
  ["image/gif", "image/gif"],
  ["image/webp", "image/webp"],
  ["image/bmp", "image/bmp"],
  ["image/x-ms-bmp", "image/bmp"],
  ["text/plain", "text/plain; charset=utf-8"],
  ["text/csv", "text/csv; charset=utf-8"],
]);

const VIEWABLE_EXTENSIONS = new Map<string, string>([
  ["pdf", "application/pdf"],
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["gif", "image/gif"],
  ["webp", "image/webp"],
  ["bmp", "image/bmp"],
  ["txt", "text/plain; charset=utf-8"],
  ["csv", "text/csv; charset=utf-8"],
]);

const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

function normalizedMimeType(mimeType: string | null | undefined) {
  return mimeType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function extensionOf(fileName: string | null | undefined) {
  if (!fileName) return "";
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex > -1 ? normalized.slice(dotIndex + 1) : "";
}

/** Retorna um MIME seguro para visualização inline ou null para formatos não suportados. */
export function inlineDocumentMimeType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
) {
  const normalizedMime = normalizedMimeType(mimeType);
  const supportedMime = VIEWABLE_MIME_TYPES.get(normalizedMime);
  if (supportedMime) return supportedMime;

  // Extensão é fallback somente para anexos legados sem MIME confiável.
  if (!GENERIC_MIME_TYPES.has(normalizedMime)) return null;
  return VIEWABLE_EXTENSIONS.get(extensionOf(fileName)) ?? null;
}

export function isDocumentViewable(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
) {
  return inlineDocumentMimeType(mimeType, fileName) !== null;
}

export function documentContentDisposition(disposition: "attachment" | "inline", fileName: string) {
  const cleanName = fileName.replace(/[\u0000-\u001f\u007f]/g, "_") || "documento";
  const fallback = cleanName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "_") || "documento";
  const encoded = encodeURIComponent(cleanName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
