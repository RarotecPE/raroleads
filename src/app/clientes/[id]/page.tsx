import { FileText, Mail, Paperclip, Pencil, Plus, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  baseModules,
  baseResponsaveis,
  bases,
  contratoModulos,
  contratos,
  documentos,
  eventos,
  municipios,
  pendencias,
  propostas,
} from "@/db/schema";
import { ContratoForm } from "@/components/contrato-form";
import { ModuloActions } from "@/components/modulo-actions";
import { ClienteForm } from "@/components/cliente-form";
import {
  BaseForm,
  DocumentoForm,
  ModuloForm,
  PropostaForm,
  PropostaSituacaoForm,
} from "@/components/registry-forms";
import { Badge, Empty, Panel, PanelHeader, Stat, YesNo, btnGhost, btnPrimary, btnXsGhost } from "@/components/ui";
import {
  EVENTO_TIPOS,
  MODULE_CATALOG,
  PENDENCIA_TIPOS,
  optLabel,
  optTone,
} from "@/lib/constants";
import { resolverPendencia } from "@/lib/actions";
import { contratoView, contratadoSet, moduloState, syncPendencias } from "@/lib/domain";
import * as modActions from "@/lib/actions";
import { formatDate, formatDateTime, norm } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await syncPendencias();

  const [m] = await db.select().from(municipios).where(eq(municipios.id, id));
  if (!m) notFound();

  const bs = await db.select().from(bases).where(eq(bases.municipioId, id));
  const responsaveis = await db.select().from(baseResponsaveis).where(eq(baseResponsaveis.municipioId, id));
  const baseIds = bs.map((b) => b.id);
  const mods = baseIds.length
    ? await db.select().from(baseModules).where(inArray(baseModules.baseId, baseIds))
    : [];
  const cs = await db.select().from(contratos).where(eq(contratos.municipioId, id));
  const cIds = cs.map((c) => c.id);
  const cms = cIds.length
    ? await db.select().from(contratoModulos).where(inArray(contratoModulos.contratoId, cIds))
    : [];
  const props = await db.select().from(propostas).where(eq(propostas.municipioId, id));
  const docsList = await db.select().from(documentos).where(eq(documentos.municipioId, id));
  const evts = await db
    .select()
    .from(eventos)
    .where(eq(eventos.municipioId, id))
    .orderBy(desc(eventos.data), desc(eventos.createdAt));
  const pends = await db.select().from(pendencias).where(eq(pendencias.municipioId, id));

  const conSet = contratadoSet(cms, cs);
  const vigentes = cs.filter((c) => c.situacao === "vigente").length;
  const pendsAbertas = pends.filter((p) => p.situacao === "aberta");
  const baseById = new Map(bs.map((b) => [b.id, b]));
  const responsavelByBaseId = new Map(responsaveis.map((responsavel) => [responsavel.baseId, responsavel]));
  const modById = new Map(mods.map((mo) => [mo.id, mo]));

  const owned = new Set(mods.map((mo) => norm(mo.nome)));
  const oportunidades =
    ["cliente_ativo", "em_negociacao"].includes(m.situacao) && owned.size > 0
      ? MODULE_CATALOG.filter((c) => !owned.has(norm(c)))
      : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecalho do cliente */}
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-app-foreground">{m.clienteNome}</h2>
              <Badge tone="muted">{m.municipio} - {m.uf}</Badge>
              <Badge tone={optTone(m.situacao)}>{optLabel(m.situacao)}</Badge>
            </div>
            <p className="mt-1 text-xs text-app-muted-foreground">
              {m.codigoIbge ? `IBGE ${m.codigoIbge}` : "IBGE não informado"}
              {` · População Estimada: ${m.populacao !== null ? `${m.populacao.toLocaleString("pt-BR")} hab.` : "não informada"}`}
              {` · Criado em ${formatDateTime(m.createdAt)}`}
            </p>
            {m.dadosAdministrativos ? (
              <p className="mt-2 max-w-2xl text-sm text-app-muted-foreground">{m.dadosAdministrativos}</p>
            ) : null}
            {m.observacoes ? (
              <p className="mt-1 max-w-2xl text-sm text-app-muted-foreground">{m.observacoes}</p>
            ) : null}
          </div>
          <ClienteForm
            cliente={m}
            trigger={
              <button type="button" className={btnGhost}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
            }
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Bases" value={bs.length} />
          <Stat label="Módulos" value={mods.length} />
          <Stat label="Contratos vigentes" value={vigentes} tone="success" />
          <Stat label="Pendências abertas" value={pendsAbertas.length} tone={pendsAbertas.length ? "warning" : "muted"} />
        </div>
        {oportunidades.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-app-md border border-app-primary/30 bg-app-primary/5 px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-app-primary" />
            <span className="text-xs font-semibold text-app-foreground">Oportunidades comerciais:</span>
            {oportunidades.map((o) => (
              <Badge key={o} tone="primary">{o}</Badge>
            ))}
          </div>
        ) : null}
      </Panel>

      {/* Bases e módulos */}
      <Panel>
        <PanelHeader
          title="Bases e módulos"
          description="Contratar ≠ habilitar ≠ executar — cada estado é controlado separadamente"
          right={
            <BaseForm
              municipioId={m.id}
              trigger={
                <button type="button" className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Nova base
                </button>
              }
            />
          }
        />
        <div className="flex flex-col gap-4 p-3 sm:p-5">
          {bs.length === 0 ? (
            <Empty title="Nenhuma base cadastrada" description="Crie a primeira unidade operacional deste cliente." />
          ) : (
            bs.map((b) => {
              const bMods = mods.filter((mo) => mo.baseId === b.id);
              const responsavel = responsavelByBaseId.get(b.id);
              return (
                <section key={b.id} className="rounded-app-lg border border-app-border bg-app-surface-elevated/30">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-app-foreground">{b.nome}</h3>
                      <Badge tone="muted">{b.tipo}</Badge>
                      {!b.cnpj ? <Badge tone="warning">Sem CNPJ</Badge> : <span className="text-xs text-app-muted-foreground">{b.cnpj}</span>}
                      {responsavel ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs text-app-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {responsavel.nome} · {responsavel.email}
                          </span>
                          <Badge tone={responsavel.avisoHabilitacaoEmail ? "success" : "muted"}>
                            Aviso {responsavel.avisoHabilitacaoEmail ? "habilitado" : "desabilitado"}
                          </Badge>
                        </>
                      ) : null}
                    </div>
                    <ModuloForm
                      baseId={b.id}
                      municipioId={m.id}
                      trigger={
                        <button type="button" className={btnXsGhost}>
                          <Plus className="h-3.5 w-3.5" /> Novo módulo
                        </button>
                      }
                    />
                  </header>
                  <div className="flex flex-col divide-y divide-app-border">
                    {bMods.length === 0 ? (
                      <p className="px-4 py-4 text-xs text-app-muted-foreground">Nenhum módulo nesta base.</p>
                    ) : (
                      bMods.map((mo) => {
                        const contratado = conSet.has(mo.id);
                        const state = moduloState(mo, contratado);
                        return (
                          <div key={mo.id} className="flex flex-col gap-2.5 px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-app-foreground">{mo.nome}</span>
                              <Badge tone={state.tone}>{state.label}</Badge>
                              <div className="ml-auto flex flex-wrap items-center gap-3">
                                <YesNo yes={contratado} label="Contrato" />
                                <YesNo yes={!!mo.habilitadoAt && !mo.desabilitadoAt} label="Habilitado" />
                                <YesNo yes={!!mo.execucaoInicio && !mo.desabilitadoAt} label="Execução" />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-app-muted-foreground">
                              {mo.solicitacaoAt ? <span>Solicitação: {formatDate(mo.solicitacaoAt)} ({optLabel(mo.solicitacaoOrigem)})</span> : null}
                              {mo.habilitadoAt ? <span>Habilitado: {formatDate(mo.habilitadoAt)}</span> : null}
                              {mo.migracaoInicio ? (
                                <span>Migração: {formatDate(mo.migracaoInicio)} → {mo.migracaoFim ? formatDate(mo.migracaoFim) : "em andamento"}</span>
                              ) : null}
                              {mo.execucaoInicio ? <span>Em execução desde: {formatDate(mo.execucaoInicio)}</span> : null}
                              {mo.desabilitadoAt ? (
                                <span className="text-app-danger">Desabilitado: {formatDate(mo.desabilitadoAt)} · {optLabel(mo.desabilitadoMotivo)}</span>
                              ) : null}
                            </div>
                            <ModuloActions
                              id={mo.id}
                              municipioId={m.id}
                              habilitadoAt={mo.habilitadoAt}
                              solicitacaoAt={mo.solicitacaoAt}
                              migracaoInicio={mo.migracaoInicio}
                              migracaoFim={mo.migracaoFim}
                              implantacaoStatus={mo.implantacaoStatus}
                              execucaoInicio={mo.execucaoInicio}
                              desabilitadoAt={mo.desabilitadoAt}
                              actions={{
                                habilitar: modActions.habilitarModulo,
                                migracao: modActions.migracaoModulo,
                                implantacao: modActions.implantacaoModulo,
                                execucao: modActions.execucaoModulo,
                                desabilitar: modActions.desabilitarModulo,
                                reabilitar: modActions.reabilitarModulo,
                              }}
                            />
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

      {/* Contratos */}
      <Panel>
        <PanelHeader
          title="Contratos"
          right={
            <ContratoForm
              municipioId={m.id}
              propostas={props.map((p) => ({ id: p.id, tipo: p.tipo, data: p.data }))}
              trigger={
                <button type="button" className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Novo contrato
                </button>
              }
            />
          }
        />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {cs.length === 0 ? (
            <Empty title="Nenhum contrato" description="Cadastre quando houver formalização." />
          ) : (
            cs.map((c) => {
              const view = contratoView(c);
              const cobertura = cms.filter((cm) => cm.contratoId === c.id).length;
              return (
                <Link
                  key={c.id}
                  href={`/contratos/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5 transition-colors hover:border-app-muted-foreground/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-app-foreground">
                      <FileText className="mr-1.5 inline h-4 w-4 text-app-muted-foreground" />
                      Contrato {c.numero}
                      <span className="ml-2 text-xs font-normal text-app-muted-foreground">{optLabel(c.modalidade)}</span>
                    </p>
                    <p className="text-xs text-app-muted-foreground">
                      Vigência: {formatDate(c.dataInicio)} → {formatDate(c.dataFim)} · {cobertura} módulo(s) vinculado(s)
                    </p>
                  </div>
                  <Badge tone={view.tone}>{view.label}</Badge>
                </Link>
              );
            })
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Propostas */}
        <Panel>
          <PanelHeader
            title="Propostas"
            right={
              <PropostaForm
                municipioId={m.id}
                trigger={
                  <button type="button" className={btnXsGhost}>
                    <Plus className="h-3.5 w-3.5" /> Nova
                  </button>
                }
              />
            }
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {props.length === 0 ? (
              <Empty title="Nenhuma proposta" />
            ) : (
              props.map((p) => (
                <div key={p.id} className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-app-foreground">{optLabel(p.tipo)}</p>
                    <Badge tone={optTone(p.situacao)}>{optLabel(p.situacao)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-app-muted-foreground">
                    {formatDate(p.data)}
                    {p.basesEnvolvidas ? ` · Bases: ${p.basesEnvolvidas}` : ""}
                    {p.modulosEnvolvidos ? ` · Módulos: ${p.modulosEnvolvidos}` : ""}
                  </p>
                  <div className="mt-2">
                    <PropostaSituacaoForm id={p.id} situacao={p.situacao} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Documentos */}
        <Panel>
          <PanelHeader
            title="Documentos"
            right={
              <DocumentoForm
                municipioId={m.id}
                contratos={cs.map((c) => ({ id: c.id, numero: c.numero }))}
                trigger={
                  <button type="button" className={btnXsGhost}>
                    <Paperclip className="h-3.5 w-3.5" /> Anexar
                  </button>
                }
              />
            }
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {docsList.length === 0 ? (
              <Empty title="Nenhum documento" description="Anexe contratos, propostas, atas e evidências." />
            ) : (
              docsList.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-foreground">{d.nome}</p>
                    <p className="truncate text-xs text-app-muted-foreground">
                      {d.referencia ?? "Sem referência"}
                      {d.contratoId ? ` · Contrato ${cs.find((c) => c.id === d.contratoId)?.numero ?? ""}` : ""}
                    </p>
                  </div>
                  <Badge tone={optTone(d.tipo)}>{optLabel(d.tipo)}</Badge>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Pendências */}
        <Panel>
          <PanelHeader title="Pendências" description="Automáticas reabrem se a condição persistir" />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {pends.filter((p) => p.situacao === "aberta").length === 0 ? (
              <Empty title="Nenhuma pendência aberta" />
            ) : (
              pends
                .filter((p) => p.situacao === "aberta")
                .map((p) => (
                  <div key={p.id} className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Badge tone={PENDENCIA_TIPOS[p.tipo]?.tone ?? "muted"}>{PENDENCIA_TIPOS[p.tipo]?.label ?? p.tipo}</Badge>
                      <form action={resolverPendencia}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className={btnXsGhost} title="Resolver pendência" aria-label="Resolver pendência">
                          <XCircle className="h-3.5 w-3.5" /> Resolver
                        </button>
                      </form>
                    </div>
                    <p className="mt-1.5 text-xs text-app-muted-foreground">{p.descricao}</p>
                    {p.baseModuleId && modById.get(p.baseModuleId) ? (
                      <p className="mt-0.5 text-[11px] text-app-muted-foreground">
                        Módulo: {modById.get(p.baseModuleId)?.nome} · Base: {baseById.get(modById.get(p.baseModuleId!)!.baseId)?.nome}
                      </p>
                    ) : null}
                  </div>
                ))
            )}
          </div>
        </Panel>

        {/* Linha do tempo */}
        <Panel>
          <PanelHeader title="Linha do tempo" description="Toda ação relevante gera evento histórico" />
          <div className="flex max-h-[28rem] flex-col gap-0 overflow-y-auto p-3 sm:p-4">
            {evts.length === 0 ? (
              <Empty title="Sem eventos registrados" />
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
                    <p className="mt-0.5 text-[11px] text-app-muted-foreground">
                      Registrado por {e.usuario}
                      {e.baseModuleId && modById.get(e.baseModuleId) ? ` · Módulo ${modById.get(e.baseModuleId)?.nome}` : ""}
                      {e.contratoId ? ` · Contrato ${cs.find((c) => c.id === e.contratoId)?.numero ?? ""}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
