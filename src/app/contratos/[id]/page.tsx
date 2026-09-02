import { Download, Link2, Link2Off, Paperclip, Plus, Save } from "lucide-react";
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
import { FileInput } from "@/components/file-input";
import { DocumentoForm } from "@/components/registry-forms";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Badge, Empty, Field, Panel, PanelHeader, Stat, btnPrimary, btnXs, btnXsGhost, inputCls, selectCls, textareaCls } from "@/components/ui";
import {
  createAditivo,
  desvincularModulo,
  setContratoSituacao,
  vincularModulo,
} from "@/lib/actions";
import {
  ADITIVO_TIPOS,
  CONTRATO_SITUACOES,
  DOCUMENTO_TIPOS,
  EVENTO_TIPOS,
  optLabel,
  optTone,
} from "@/lib/constants";
import { contratoView, syncPendencias } from "@/lib/domain";
import { formatDate, formatDateTime, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp";

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await syncPendencias();

  const [c] = await db.select().from(contratos).where(eq(contratos.id, id));
  if (!c) notFound();

  const [m] = await db.select().from(municipios).where(eq(municipios.id, c.municipioId));
  const bs = await db.select().from(bases).where(eq(bases.municipioId, c.municipioId));
  const baseIds = new Set(bs.map((b) => b.id));
  const modsAll = await db.select().from(baseModules);
  const mods = modsAll.filter((mo) => baseIds.has(mo.baseId));
  const vinculos = await db
    .select()
    .from(contratoModulos)
    .where(eq(contratoModulos.contratoId, id));
  const adts = await db
    .select()
    .from(aditivos)
    .where(eq(aditivos.contratoId, id))
    .orderBy(desc(aditivos.data));
  const docs = await db.select().from(documentos).where(eq(documentos.contratoId, id));
  const evts = await db
    .select()
    .from(eventos)
    .where(eq(eventos.contratoId, id))
    .orderBy(desc(eventos.data), desc(eventos.createdAt));

  const view = contratoView(c);
  const linked = new Set(vinculos.map((v) => v.baseModuleId));

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
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Assinatura" value={<span className="text-base">{formatDate(c.dataAssinatura)}</span>} />
          <Stat label="Início" value={<span className="text-base">{formatDate(c.dataInicio)}</span>} />
          <Stat label="Vigência final" value={<span className="text-base">{formatDate(c.dataFim)}</span>} tone={view.daysLeft !== null && view.daysLeft <= 60 ? "warning" : "muted"} />
          <Stat label="Módulos vinculados" value={linked.size} tone="primary" />
        </div>
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
                            <form action={isLinked ? desvincularModulo : vincularModulo}>
                              <input type="hidden" name="contratoId" value={c.id} />
                              <input type="hidden" name="baseModuleId" value={mo.id} />
                              <button
                                type="submit"
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
                              </button>
                            </form>
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
              <Dialog
                title="Novo aditivo"
                description="Inclusão/exclusão de módulo, prazo, valor ou alteração contratual."
                trigger={
                  <button type="button" className={btnXsGhost}>
                    <Plus className="h-3.5 w-3.5" /> Novo
                  </button>
                }
              >
                <DialogForm action={createAditivo}>
                  <input type="hidden" name="contratoId" value={c.id} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Tipo">
                      <select name="tipo" className={selectCls} defaultValue="inclusao_modulo">
                        {ADITIVO_TIPOS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Data">
                      <input type="date" name="data" defaultValue={todayISO()} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Descrição">
                    <textarea name="descricao" required rows={3} className={textareaCls} placeholder="Ex.: Inclusão do módulo Portal na base Prefeitura." />
                  </Field>
                  <div className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
                    <p className="text-sm font-semibold text-app-foreground">Anexo do aditivo</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Tipo do documento">
                        <select name="documentoTipo" className={selectCls} defaultValue="aditivo">
                          {DOCUMENTO_TIPOS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Nome de exibicao">
                        <input name="documentoNome" className={inputCls} placeholder="Ex.: Aditivo assinado" />
                      </Field>
                      <Field label="Arquivo" hint="Documentos e imagens ate 20 MB." className="sm:col-span-2">
                        <FileInput name="arquivo" accept={FILE_ACCEPT} />
                      </Field>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <SubmitButton className={btnPrimary}>Registrar aditivo</SubmitButton>
                  </div>
                </DialogForm>
              </Dialog>
            }
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {adts.length === 0 ? (
              <Empty title="Nenhum aditivo" />
            ) : (
              adts.map((a) => (
                <div key={a.id} className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={optTone(a.tipo)}>{optLabel(a.tipo)}</Badge>
                    <span className="text-xs text-app-muted-foreground">{formatDate(a.data)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-app-foreground">{a.descricao}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Documentos do contrato */}
        <Panel>
          <PanelHeader
            title="Documentos do contrato"
            right={
              <DocumentoForm
                municipioId={c.municipioId}
                contratoId={c.id}
                trigger={
                  <button type="button" className={btnXsGhost}>
                    <Paperclip className="h-3.5 w-3.5" /> Anexar
                  </button>
                }
              />
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
                  <div className="flex items-center gap-2">
                    <Badge tone={optTone(d.tipo)}>{optLabel(d.tipo)}</Badge>
                    {d.storageKey ? (
                      <Link href={`/api/documentos/${d.id}/download`} className={btnXsGhost} title="Baixar documento" aria-label={`Baixar ${d.nome}`}>
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </Link>
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
