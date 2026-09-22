import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentos, propostas } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth";
import { canView } from "@/lib/auth-permissions";
import { getDocumentFile } from "@/lib/document-storage";
import { documentContentDisposition } from "@/lib/document-view";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePermission(request, canView);
  if (hasAuthError(session)) return session.response;

  const { id } = await params;
  const [documento] = await db.select().from(documentos).where(eq(documentos.id, id));
  if (!documento) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
  if (documento.propostaId) {
    const [proposal] = await db.select({ id: propostas.id }).from(propostas).where(and(eq(propostas.id, documento.propostaId), isNull(propostas.excluidaAt)));
    if (!proposal) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
  }
  if (!documento.storageKey) return NextResponse.json({ error: "Documento sem arquivo armazenado." }, { status: 404 });

  const object = await getDocumentFile(documento.storageKey);
  if (!object.Body) return NextResponse.json({ error: "Arquivo nao encontrado no storage." }, { status: 404 });

  const bytes = await object.Body.transformToByteArray();
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const fileName = documento.arquivoNomeOriginal ?? documento.nome;

  return new NextResponse(body, {
    headers: {
      "content-type": documento.mimeType ?? object.ContentType ?? "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "content-disposition": documentContentDisposition("attachment", fileName),
      "cache-control": "private, no-store",
    },
  });
}
