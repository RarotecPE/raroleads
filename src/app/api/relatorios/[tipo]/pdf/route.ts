import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth";
import { canView } from "@/lib/auth-permissions";
import { generateReportPdf, getReportDefinition, reportFileName, type ReportTipo } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contentDisposition(fileName: string) {
  return `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> },
) {
  const session = await requirePermission(request, canView);
  if (hasAuthError(session)) return session.response;

  const { tipo } = await params;
  const definition = getReportDefinition(tipo);
  if (!definition) {
    return NextResponse.json({ error: "Relatorio nao encontrado." }, { status: 404 });
  }

  const buffer = await generateReportPdf(definition.tipo as ReportTipo);
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);

  return new NextResponse(body, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(buffer.byteLength),
      "content-disposition": contentDisposition(reportFileName(definition.tipo as ReportTipo)),
      "cache-control": "private, no-store",
    },
  });
}
