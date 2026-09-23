export type DocumentShareApi = {
  canShare: (data: ShareData) => boolean;
  share: (data: ShareData) => Promise<void>;
};

type DocumentFetcher = (input: string, init?: RequestInit) => Promise<Response>;

export function supportsDocumentFileSharing(api: Partial<DocumentShareApi> | null | undefined) {
  if (typeof api?.share !== "function" || typeof api.canShare !== "function" || typeof File === "undefined") return false;
  try {
    return api.canShare({ files: [new File([""], "raroclients-share-test.txt", { type: "text/plain" })] });
  } catch {
    return false;
  }
}

export function isDocumentShareCancellation(error: unknown) {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}

export async function shareDocumentFile({
  documentId,
  fileName,
  mimeType,
  api,
  fetcher = fetch,
}: {
  documentId: string;
  fileName: string;
  mimeType?: string | null;
  api: DocumentShareApi;
  fetcher?: DocumentFetcher;
}) {
  const response = await fetcher(`/api/documentos/${encodeURIComponent(documentId)}/download`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Não foi possível obter o documento para compartilhamento.");

  const blob = await response.blob();
  const file = new File([blob], fileName, { type: blob.type || mimeType || "application/octet-stream" });
  const shareData: ShareData = {
    files: [file],
    title: fileName,
    text: "Documento compartilhado pelo Raroclients.",
  };
  if (!api.canShare(shareData)) throw new Error("Este dispositivo não permite compartilhar este tipo de documento.");
  await api.share(shareData);
}
