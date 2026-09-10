import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentos } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth";
import { canView } from "@/lib/auth-permissions";
import { getDocumentFile } from "@/lib/document-storage";
import { documentContentDisposition, inlineDocumentMimeType } from "@/lib/document-view";

export const dynamic = "force-dynamic";

function isStorageNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return storageError.name === "NoSuchKey" || storageError.$metadata?.httpStatusCode === 404;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePermission(request, canView);
  if (hasAuthError(session)) return session.response;

  const { id } = await params;
  const [documento] = await db.select().from(documentos).where(eq(documentos.id, id));
  if (!documento) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
  if (!documento.storageKey) return NextResponse.json({ error: "Documento sem arquivo armazenado." }, { status: 404 });

  const fileName = documento.arquivoNomeOriginal ?? documento.nome;
  const contentType = inlineDocumentMimeType(documento.mimeType, fileName);
  if (!contentType) {
    return NextResponse.json({ error: "Formato sem suporte para visualizacao no navegador." }, { status: 415 });
  }

  let object: Awaited<ReturnType<typeof getDocumentFile>>;
  try {
    object = await getDocumentFile(documento.storageKey);
  } catch (error) {
    if (isStorageNotFound(error)) {
      return NextResponse.json({ error: "Arquivo nao encontrado no storage." }, { status: 404 });
    }
    throw error;
  }
  if (!object.Body) return NextResponse.json({ error: "Arquivo nao encontrado no storage." }, { status: 404 });

  const bytes = await object.Body.transformToByteArray();
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "content-length": String(bytes.byteLength),
      "content-disposition": documentContentDisposition("inline", fileName),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
