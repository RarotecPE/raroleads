import { Download, Eye, Link2, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { baseModules, bases, contratoModulos, contratos, documentos, eventos, municipios } from "@/db/schema";
import { DocumentoForm } from "@/components/registry-forms";
import { DesvincularBaseContratoForm } from "@/components/desvincular-base-contrato-form";
import { SubmitButton } from "@/components/dialog";
import { Badge, Empty, Panel, PanelHeader, Stat, btnXs, btnXsGhost } from "@/components/ui";
import { vincularModulo } from "@/lib/actions";
import { occupiedBaseIds } from "@/lib/contract-reference";
import { EVENTO_TIPOS, optLabel, optTone } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { getCurrentSession } from "@/lib/auth";
import { isDocumentViewable } from "@/lib/document-view";

export const dynamic = "force-dynamic";

export default async function ContratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, contratoRows] = await Promise.all([
    getCurrentSession(),
    db.select().from(contratos).where(eq(contratos.id, id)),
  ]);
  const canManage = session?.permissions.manage === true;
  const [c] = contratoRows;
  if (!c) notFound();

  const [municipioRows, bs, modsAll, allVinculos, docs, evts] = await Promise.all([
    db.select().from(municipios).where(eq(municipios.id, c.municipioId)),
    db.select().from(bases).where(eq(bases.municipioId, c.municipioId)),
    db.select().from(baseModules),
    db.select().from(contratoModulos),
    db.select().from(documentos).where(eq(documentos.contratoId, id)),
    db.select().from(eventos).where(eq(eventos.contratoId, id)).orderBy(desc(eventos.data), desc(eventos.createdAt)),
  ]);
  const [cliente] = municipioRows;
  const vinculos = allVinculos.filter((vinculo) => vinculo.contratoId === id);
  const baseIds = new Set(bs.map((b) => b.id));
  const mods = modsAll.filter((mo) => baseIds.has(mo.baseId));
  const linked = new Set(vinculos.map((v) => v.baseModuleId));
  const basesDeOutrosContratos = occupiedBaseIds(allVinculos.filter((vinculo) => vinculo.contratoId !== id), modsAll);
  const basesCobertas = bs.filter((base) => mods.some((modulo) => modulo.baseId === base.id && linked.has(modulo.id)));
  const clienteEncerrado = cliente?.situacao === "cliente_encerrado";
  const historico = evts.filter((evento) =>
    !evento.aditivoId && ["contrato_criado", "modulo_vinculado", "modulo_desvinculado", "base_desvinculada_contrato", "documento_anexado"].includes(evento.tipo),
  );

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-4 sm:p-5">
        <h2 className="text-xl font-bold text-app-foreground">Contrato {c.numero}</h2>
        <p className="mt-1 text-xs text-app-muted-foreground">
          {cliente ? <Link href={`/clientes/${cliente.id}`} className="text-app-primary hover:underline">{cliente.clienteNome}</Link> : null}
          {` · ${optLabel(c.modalidade)}`}
          {c.processo ? ` · Processo ${c.processo}` : ""}
        </p>
        {c.observacoes ? <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-app-muted-foreground">{c.observacoes}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Bases contempladas" value={basesCobertas.length} tone="primary" />
          <Stat label="Módulos contemplados" value={linked.size} tone="primary" />
          <Stat label="Anexos" value={docs.length} />
          <Stat label="Cadastrado em" value={<span className="text-base">{formatDateTime(c.createdAt)}</span>} />
        </div>
        {clienteEncerrado ? <p className="mt-4 text-xs text-app-muted-foreground">Cliente encerrado. Alterações bloqueadas.</p> : null}
      </Panel>

      <Panel>
        <PanelHeader title="Bases e módulos contemplados" description="Uma base é contemplada quando ao menos um de seus módulos está vinculado." />
        <div className="flex flex-col gap-4 p-3 sm:p-5">
          {bs.length === 0 ? <Empty title="Cliente sem bases" /> : bs.map((base) => {
            const modulosDaBase = mods.filter((modulo) => modulo.baseId === base.id);
            const vinculados = modulosDaBase.filter((modulo) => linked.has(modulo.id)).length;
            const ocupadaPorOutro = basesDeOutrosContratos.has(base.id);
            return (
              <section key={base.id} className="rounded-app-lg border border-app-border bg-app-surface-elevated/30 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-app-foreground">{base.nome}</h3>
                  <div className="flex items-center gap-2">
                    <Badge tone={vinculados ? "success" : "muted"}>{vinculados}/{modulosDaBase.length} módulo(s)</Badge>
                    {canManage && !clienteEncerrado && vinculados > 0 ? <DesvincularBaseContratoForm contratoId={c.id} baseId={base.id} baseNome={base.nome} /> : null}
                  </div>
                </div>
                {ocupadaPorOutro ? <p className="mt-2 text-xs text-app-warning">Esta base também possui vínculo com outro contrato. Desvincule-a desse contrato para liberar novos módulos.</p> : null}
                <div className="mt-2 flex flex-col gap-1.5">
                  {modulosDaBase.length === 0 ? <p className="text-xs text-app-muted-foreground">Nenhum módulo nesta base.</p> : modulosDaBase.map((modulo) => {
                    const isLinked = linked.has(modulo.id);
                    return (
                      <div key={modulo.id} className="flex items-center justify-between gap-3 rounded-app-md bg-app-surface px-3 py-2">
                        <span className="text-sm text-app-foreground">{modulo.nome}</span>
                        {!canManage || clienteEncerrado || isLinked || ocupadaPorOutro ? (
                          <Badge tone={isLinked ? "success" : "muted"}>{isLinked ? "Vinculado" : ocupadaPorOutro ? "Base ocupada" : "Não vinculado"}</Badge>
                        ) : (
                          <form action={vincularModulo}>
                            <input type="hidden" name="contratoId" value={c.id} />
                            <input type="hidden" name="baseModuleId" value={modulo.id} />
                            <SubmitButton
                              className={btnXs}
                              aria-label={`Vincular ${modulo.nome}`}
                            >
                              <Link2 className="h-3.5 w-3.5" /> Vincular
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Documentos do contrato"
          right={!canManage || clienteEncerrado ? null : (
            <DocumentoForm
              municipioId={c.municipioId}
              contratoId={c.id}
              trigger={<button type="button" className={btnXsGhost}><Paperclip className="h-3.5 w-3.5" /> Anexar</button>}
            />
          )}
        />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {docs.length === 0 ? <Empty title="Nenhum documento" description="Anexe o contrato para consulta rápida." /> : docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-foreground">{doc.nome}</p>
                <p className="truncate text-xs text-app-muted-foreground">{doc.arquivoNomeOriginal ?? doc.referencia ?? "Sem arquivo armazenado"}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge tone={optTone(doc.tipo)}>{optLabel(doc.tipo)}</Badge>
                {doc.storageKey ? (
                  <>
                    {isDocumentViewable(doc.mimeType, doc.arquivoNomeOriginal ?? doc.nome) ? (
                      <Link href={`/api/documentos/${doc.id}/view`} target="_blank" rel="noopener noreferrer" className={btnXsGhost} aria-label={`Visualizar ${doc.nome}`}>
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </Link>
                    ) : null}
                    <Link href={`/api/documentos/${doc.id}/download`} className={btnXsGhost} aria-label={`Baixar ${doc.nome}`}>
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Histórico do vínculo" />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {historico.length === 0 ? <Empty title="Sem eventos" /> : historico.map((evento) => (
            <div key={evento.id} className="rounded-app-md border border-app-border bg-app-surface px-3 py-2">
              <p className="text-xs font-semibold text-app-muted-foreground">{EVENTO_TIPOS[evento.tipo] ?? evento.tipo} · {formatDateTime(evento.createdAt)}</p>
              <p className="mt-1 text-sm text-app-foreground">{evento.descricao}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
