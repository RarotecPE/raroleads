"use client";

import { LoaderCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { OperationLoadingTracker } from "@/components/operation-loading";
import { btnXsGhost } from "@/components/ui";
import { isDocumentShareCancellation, shareDocumentFile, supportsDocumentFileSharing, type DocumentShareApi } from "@/lib/document-share";

export function DocumentShareButton({ documentId, fileName, mimeType }: {
  documentId: string;
  fileName: string;
  mimeType?: string | null;
}) {
  const [supported, setSupported] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setSupported(supportsDocumentFileSharing(navigator));
  }, []);

  if (!supported) return null;

  async function handleShare() {
    setSharing(true);
    try {
      await shareDocumentFile({ documentId, fileName, mimeType, api: navigator as DocumentShareApi });
    } catch (error) {
      if (!isDocumentShareCancellation(error)) {
        window.alert(error instanceof Error ? error.message : "Não foi possível compartilhar o documento.");
      }
    } finally {
      setSharing(false);
    }
  }

  return <>
    <OperationLoadingTracker active={sharing} />
    <button type="button" onClick={handleShare} disabled={sharing} className={btnXsGhost} title="Compartilhar pelo WhatsApp ou outro aplicativo" aria-label={`Compartilhar ${fileName}`}>
      {sharing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
      {sharing ? "Preparando..." : "Compartilhar"}
    </button>
  </>;
}
