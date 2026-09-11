import { Download, Eye, Link2, Link2Off, Paperclip, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  aditivos,
  baseModules,
  bases,
  contratoModulos,
  contratos,
  documentos,
  eventos,
  municipios,
} from "@/db/schema";
import { AditivoForm } from "@/components/aditivo-form";
import { DocumentoForm } from "@/components/registry-forms";
import { SubmitButton } from "@/components/dialog";
import { Badge, Empty, Panel, PanelHeader, Stat, btnXs, btnXsGhost, selectCls } from "@/components/ui";
import {
  desvincularModulo,
  setContratoSituacao,
  vincularModulo,
} from "@/lib/actions";
import {
  CONTRATO_SITUACOES,
  EVENTO_TIPOS,
  optLabel,
  optTone,
} from "@/lib/constants";
import { contratoView } from "@/lib/domain";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getCurrentSession } from "@/lib/auth";
import { isDocumentViewable } from "@/lib/document-view";

export const dynamic = "force-dynamic";

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, contratoRows] = await Promise.all([
    getCurrentSession(),
    db.select().from(contratos).where(eq(contratos.id, id)),
  ]);
  const canManage = session?.permissions.manage === true;
  const [c] = contratoRows;
  if (!c) notFound();

  const [municipioRows, bs, modsAll, vinculos, adts, docs, evts] = await Promise.all([
    db.select().from(municipios).where(eq(municipios.id, c.municipioId)),
    db.select().from(bases).where(eq(bases.municipioId, c.municipioId)),
    db.select().from(baseModules),
    db.select().from(contratoModulos).where(eq(contratoModulos.contratoId, id)),
    db.select().from(aditivos).where(eq(aditivos.contratoId, id)).orderBy(desc(aditivos.data)),
    db.select().from(documentos).where(eq(documentos.contratoId, id)),
    db.select().from(eventos).where(eq(eventos.contratoId, id)).orderBy(desc(eventos.data), desc(eventos.createdAt)),
  ]);
  const [m] = municipioRows;
  const baseIds = new Set(bs.map((b) => b.id));
  const mods = modsAll.filter((mo) => baseIds.has(mo.baseId));

  const view = contratoView(c);
  const linked = new Set(vinculos.map((v) => v.baseModuleId));
  const baseById = new Map(bs.map((base) => [base.id, base]));
  const moduleById = new Map(mods.map((modulo) => [modulo.id, modulo]));
  const clienteEncerrado = m?.situacao === "cliente_encerrado";

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-app-foreground">Contrato {c.numero}</h2>
              <Badge tone={view.tone}>{view.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-app-muted-foreground">
              {m ? (
                <Link href={`/clientes/${m.id}`} className="text-app-primary hover:underline">{m.clienteNome}</Link>
              ) : null}{" "}
              · {optLabel(c.modalidade)}
              {c.processo ? ` · Processo ${c.processo}` : ""}
            </p>
            {c.observacoes ? <p className="mt-2 max-w-2xl text-sm text-app-muted-foreground">{c.observacoes}</p> : null}
          </div>
          {!canManage || clienteEncerrado ? null : (
          <form action={setContratoSituacao} className="flex items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
            <label className="sr-only" htmlFor="situacao">Situação do contrato</label>
            <select id="situacao" name="situacao" defaultValue={c.situacao} className={selectCls}>
              {CONTRATO_SITUACOES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <SubmitButton className={btnXs.replace("h-8", "h-10")}>
              <Save className="h-4 w-4" /> Atualizar situação
            </SubmitButton>
          </form>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Assinatura" value={<span className="text-base">{formatDate(c.dataAssinatura)}</span>} />
          <Stat label="Início" value={<span className="text-base">{formatDate(c.dataInicio)}</span>} />
          <Stat label="Vigência final" value={<span className="text-base">{formatDate(c.dataFim)}</span>} tone={view.daysLeft !== null && view.daysLeft <= 60 ? "warning" : "muted"} />
          <Stat label="Módulos vinculados" value={linked.size} tone="primary" />
        </div>
        {clienteEncerrado ? (
          <div className="mt-4 rounded-app-md border border-app-border bg-app-surface-elevated/50 px-3 py-2.5 text-xs font-medium text-app-muted-foreground">
            Cliente encerrado. Alterações operacionais deste contrato estão bloqueadas.
          </div>
        ) : null}
      </Panel>

      {/* Cobertura granular: bases e módulos contemplados */}
      <Panel>
        <PanelHeader
          title="Bases e módulos contemplados"
          description="O contrato pode cobrir todas, algumas ou nenhuma base — controle granular por módulo"
        />
        <div className="flex flex-col gap-4 p-3 sm:p-5">
          {bs.length === 0 ? (
            <Empty title="Cliente sem bases" description="Cadastre bases e modulos na tela do cliente." />
          ) : (
            bs.map((b) => {
              const bMods = mods.filter((mo) => mo.baseId === b.id);
              return (
                <section key={b.id} className="rounded-app-lg border border-app-border bg-app-surface-elevated/30 px-4 py-3">
                  <h3 className="text-sm font-bold text-app-foreground">{b.nome}</h3>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {bMods.length === 0 ? (
                      <p className="text-xs text-app-muted-foreground">Nenhum módulo nesta base.</p>
                    ) : (
                      bMods.map((mo) => {
                        const isLinked = linked.has(mo.id);
                        return (
                          <div key={mo.id} className="flex items-center justify-between gap-3 rounded-app-md bg-app-surface px-3 py-2">
                            <span className="text-sm text-app-foreground">{mo.nome}</span>
                            {!canManage || clienteEncerrado ? (
                              <Badge tone={isLinked ? "success" : "muted"}>{isLinked ? "Vinculado" : "Nao vinculado"}</Badge>
                            ) : (
                            <form action={isLinked ? desvincularModulo : vincularModulo}>
                              <input type="hidden" name="contratoId" value={c.id} />
                              <input type="hidden" name="baseModuleId" value={mo.id} />
                              <SubmitButton
                                className={isLinked ? btnXsGhost : btnXs}
                                title={isLinked ? "Desvincular módulo" : "Vincular módulo ao contrato"}
                                aria-label={isLinked ? `Desvincular ${mo.nome}` : `Vincular ${mo.nome}`}
                              >
                                {isLinked ? (
                                  <>
                                    <Link2Off className="h-3.5 w-3.5 text-app-danger" /> Vinculado
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="h-3.5 w-3.5" /> Vincular
                                  </>
                                )}
                              </SubmitButton>
                            </form>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Aditivos */}
        <Panel>
          <PanelHeader
            title="Aditivos"
            description="O histórico original nunca é apagado"
            right={
              !canManage || clienteEncerrado ? null : (
                <AditivoForm
                  contratoId={c.id}
                  dataFimAtual={c.dataFim}
                  bases={bs.map((base) => ({ id: base.id, nome: base.nome, tipo: base.tipo }))}
                  modulos={mods.map((modulo) => ({ id: modulo.id, baseId: modulo.baseId, nome: modulo.nome }))}
                  linkedModuleIds={[...linked]}
                />
              )
            }
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {adts.length === 0 ? (
              <Empty title="Nenhum aditivo" />
            ) : (
              adts.map((a) => {
                const eventosDeModulo = evts.filter(
                  (evento) =>
                    evento.aditivoId === a.id &&
                    !!evento.baseModuleId &&
                    ["modulo_vinculado", "modulo_desvinculado"].includes(evento.tipo),
                );
                return (
                  <div key={a.id} className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={optTone(a.tipo)}>{optLabel(a.tipo)}</Badge>
                      <span className="text-xs text-app-muted-foreground">{formatDate(a.data)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-app-foreground">{a.descricao}</p>
                    {a.novaDataFim ? (
                      <p className="mt-1 text-xs font-medium text-app-muted-foreground">
                        Nova vigência final: {formatDate(a.novaDataFim)}
                      </p>
                    ) : null}
                    {eventosDeModulo.length > 0 ? (
                      <div className="mt-2 border-t border-app-border pt-2">
                        <p className="text-xs font-semibold text-app-muted-foreground">Módulos afetados</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {eventosDeModulo.map((evento) => {
                            const modulo = moduleById.get(evento.baseModuleId!);
                            const base = modulo ? baseById.get(modulo.baseId) : undefined;
                            return (
                              <Badge key={evento.id} tone={evento.tipo === "modulo_vinculado" ? "success" : "warning"}>
                                {base?.nome ?? "Base"} · {modulo?.nome ?? "Módulo não encontrado"}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Documentos do contrato */}
        <Panel>
          <PanelHeader
            title="Documentos do contrato"
            right={
              !canManage || clienteEncerrado ? null : (
              <DocumentoForm
                municipioId={c.municipioId}
                contratoId={c.id}
                trigger={
                  <button type="button" className={btnXsGhost}>
                    <Paperclip className="h-3.5 w-3.5" /> Anexar
                  </button>
                }
              />
              )
            }
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {docs.length === 0 ? (
              <Empty title="Nenhum documento" description="Anexe o contrato assinado para quitar a pendência documental." />
            ) : (
              docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-foreground">{d.nome}</p>
                    <p className="truncate text-xs text-app-muted-foreground">
                      {d.arquivoNomeOriginal ?? d.referencia ?? "Sem arquivo armazenado"}
                      {d.aditivoId ? " · Aditivo" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <Badge tone={optTone(d.tipo)}>{optLabel(d.tipo)}</Badge>
                    {d.storageKey ? (
                      <>
                        {isDocumentViewable(d.mimeType, d.arquivoNomeOriginal ?? d.nome) ? (
                          <Link
                            href={`/api/documentos/${d.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={btnXsGhost}
                            title="Visualizar documento"
                            aria-label={`Visualizar ${d.nome}`}
                          >
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </Link>
                        ) : null}
                        <Link href={`/api/documentos/${d.id}/download`} className={btnXsGhost} title="Baixar documento" aria-label={`Baixar ${d.nome}`}>
                          <Download className="h-3.5 w-3.5" /> Baixar
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* Histórico do contrato */}
      <Panel>
        <PanelHeader title="Histórico do contrato" />
        <div className="flex flex-col gap-0 p-3 sm:p-4">
          {evts.length === 0 ? (
            <Empty title="Sem eventos" />
          ) : (
            evts.map((e, i) => (
              <div key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < evts.length - 1 ? (
                  <span className="absolute left-[7px] top-5 h-full w-px bg-app-border" aria-hidden />
                ) : null}
                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-app-primary bg-app-surface" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-app-muted-foreground">
                    {formatDate(e.data)} · {EVENTO_TIPOS[e.tipo] ?? e.tipo}
                  </p>
                  <p className="mt-0.5 text-sm text-app-foreground">{e.descricao}</p>
                  <p className="mt-0.5 text-[11px] text-app-muted-foreground">Registrado por {e.usuario} em {formatDateTime(e.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
