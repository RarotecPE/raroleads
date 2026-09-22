import { Download, Eye, FileText, Mail, Paperclip, Pencil, Phone, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  baseModules,
  bases,
  contratoModulos,
  contratos,
  documentos,
  eventos,
  municipios,
  moduloResponsaveis,
  pendencias,
  propostas,
} from "@/db/schema";
import { ContratoForm } from "@/components/contrato-form";
import { BaseStatusActions } from "@/components/base-status-actions";
import { SubmitButton } from "@/components/dialog";
import { ModuloDetailDialog } from "@/components/modulo-detail-dialog";
import { ModuloGrupoForm } from "@/components/modulo-grupo-form";
import { ClienteForm } from "@/components/cliente-form";
import {
  BaseForm,
  DeleteResponsavelModuloForm,
  DocumentoForm,
  ModuloForm,
  ResponsavelModuloForm,
} from "@/components/registry-forms";
import { Badge, Empty, Panel, PanelHeader, Stat, YesNo, btnGhost, btnPrimary, btnXsGhost } from "@/components/ui";
import {
  EVENTO_TIPOS,
  PENDENCIA_TIPOS,
  optLabel,
  optTone,
} from "@/lib/constants";
import { computeOportunidades, contratadoSet, moduloState, syncPendencias } from "@/lib/domain";
import { isOperationalEvent, isOperationalPendingType, occupiedBaseIds } from "@/lib/contract-reference";
import * as modActions from "@/lib/actions";
import { formatCnpj } from "@/lib/cnpj";
import { formatPhone } from "@/lib/phone";
import { formatDate, formatDateTime } from "@/lib/utils";
import { isDocumentViewable } from "@/lib/document-view";
import { getCurrentSession } from "@/lib/auth";
import { hideProposalIds, parseProposalOriginNote } from "@/lib/proposal";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionPromise = getCurrentSession();
  await syncPendencias();
  const session = await sessionPromise;
  const canManage = session?.permissions.manage === true;

  const [municipioRows, bs, responsaveis, cs, props, docsList, evts, pends] = await Promise.all([
    db.select().from(municipios).where(eq(municipios.id, id)),
    db.select().from(bases).where(eq(bases.municipioId, id)),
    db.select().from(moduloResponsaveis).where(eq(moduloResponsaveis.municipioId, id)),
    db.select().from(contratos).where(eq(contratos.municipioId, id)),
    db.select().from(propostas).where(and(eq(propostas.municipioId, id), isNull(propostas.excluidaAt))),
    db.select().from(documentos).where(eq(documentos.municipioId, id)),
    db.select().from(eventos).where(eq(eventos.municipioId, id)).orderBy(desc(eventos.data), desc(eventos.createdAt)),
    db.select().from(pendencias).where(eq(pendencias.municipioId, id)),
  ]);
  const [m] = municipioRows;
  if (!m) notFound();
  const proposalOriginNote = m.observacoes ? parseProposalOriginNote(m.observacoes) : null;

  const baseIds = bs.map((b) => b.id);
  const mods = baseIds.length ? await db.select().from(baseModules).where(inArray(baseModules.baseId, baseIds)) : [];
  const cms = mods.length
    ? await db.select().from(contratoModulos).where(inArray(contratoModulos.baseModuleId, mods.map((modulo) => modulo.id)))
    : [];

  const conSet = contratadoSet(cms);
  const pendsAbertas = pends.filter((p) => p.situacao === "aberta" && isOperationalPendingType(p.tipo));
  const eventosOperacionais = evts.filter(isOperationalEvent);
  const clienteEncerrado = m.situacao === "cliente_encerrado";
  const baseById = new Map(bs.map((b) => [b.id, b]));
  const rootBases = bs.filter((base) => !base.baseSuperiorId);
  const orderedBases = [
    ...rootBases.flatMap((parent) => [parent, ...bs.filter((child) => child.baseSuperiorId === parent.id)]),
    ...bs.filter((base) => base.baseSuperiorId && !baseById.has(base.baseSuperiorId)),
  ];
  const modById = new Map(mods.map((mo) => [mo.id, mo]));
  const contratoById = new Map(cs.map((c) => [c.id, c]));
  const propostaById = new Map(props.map((p) => [p.id, p]));
  const visibleDocsList = docsList.filter((documento) => !documento.propostaId || propostaById.has(documento.propostaId));
  const modulosResponsavelOptions = mods.map((mo) => ({
    id: mo.id,
    nome: mo.nome,
    baseNome: baseById.get(mo.baseId)?.nome ?? "Base nao encontrada",
  }));
  const responsaveisByModuloId = new Map<string, typeof responsaveis>();
  for (const responsavel of responsaveis) {
    const list = responsaveisByModuloId.get(responsavel.baseModuleId) ?? [];
    list.push(responsavel);
    responsaveisByModuloId.set(responsavel.baseModuleId, list);
  }
  const moduloActionHandlers = {
    habilitar: modActions.habilitarModulo,
    migracao: modActions.migracaoModulo,
    implantacao: modActions.implantacaoModulo,
    execucao: modActions.execucaoModulo,
    desabilitar: modActions.desabilitarModulo,
    reabilitar: modActions.reabilitarModulo,
    reenviarEmail: modActions.reenviarEmailHabilitacao,
  };

  const oportunidades = computeOportunidades([m], bs, mods)[0]?.missing ?? [];

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
              <p className="mt-1 max-w-2xl text-sm text-app-muted-foreground">{proposalOriginNote ? <>{proposalOriginNote.before}<Link href={`/propostas/${encodeURIComponent(proposalOriginNote.proposalId)}`} className="font-semibold text-app-primary hover:underline">{proposalOriginNote.label}</Link>{proposalOriginNote.after}</> : m.observacoes}</p>
            ) : null}
          </div>
          {canManage ? <ClienteForm
            cliente={m}
            trigger={
              <button type="button" className={btnGhost}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
            }
          /> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Bases" value={bs.length} />
          <Stat label="Módulos" value={mods.length} />
          <Stat label="Contratos" value={cs.length} tone="success" />
          <Stat label="Pendências abertas" value={pendsAbertas.length} tone={pendsAbertas.length ? "warning" : "muted"} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-app-md border border-app-primary/30 bg-app-primary/5 px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-app-primary" />
            <span className="text-xs font-semibold text-app-foreground">Oportunidades comerciais ({oportunidades.length}):</span>
            {oportunidades.length === 0 ? <span className="text-xs text-app-muted-foreground">Nenhum módulo do catálogo pendente.</span> : oportunidades.map((o) => (
              <Badge key={o} tone="primary">{o}</Badge>
            ))}
        </div>
        {clienteEncerrado ? (
          <div className="mt-4 rounded-app-md border border-app-border bg-app-surface-elevated/50 px-3 py-2.5 text-xs font-medium text-app-muted-foreground">
            Cliente encerrado. Cadastros e ações operacionais estão bloqueados para preservar a linha do tempo.
          </div>
        ) : null}
      </Panel>

      {/* Bases e módulos */}
      <Panel>
        <PanelHeader
          title="Bases e módulos"
          description="Contratar ≠ habilitar ≠ executar — cada estado é controlado separadamente"
          right={
            !canManage || clienteEncerrado ? null : (
              <div className="flex flex-wrap items-center gap-2">
                {bs.some((base) => base.situacao === "ativa") ? (
                  <ModuloGrupoForm
                    municipioId={m.id}
                    bases={bs.filter((base) => base.situacao === "ativa").map((base) => ({ id: base.id, nome: base.nome, tipo: base.tipo }))}
                    modulos={mods.map((modulo) => ({ baseId: modulo.baseId, nome: modulo.nome }))}
                  />
                ) : null}
                <BaseForm
                  municipioId={m.id}
                  bases={bs}
                  trigger={
                    <button type="button" className={btnPrimary}>
                      <Plus className="h-4 w-4" /> Nova base
                    </button>
                  }
                />
              </div>
            )
          }
        />
        <div className="flex flex-col gap-4 p-3 sm:p-5">
          {bs.length === 0 ? (
            <Empty title="Nenhuma base cadastrada" description="Crie a primeira unidade operacional deste cliente." />
          ) : (
            orderedBases.map((b) => {
              const bMods = mods.filter((mo) => mo.baseId === b.id);
              const childBases = bs.filter((child) => child.baseSuperiorId === b.id);
              return (
                <section key={b.id} className="rounded-app-lg border border-app-border bg-app-surface-elevated/30">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-app-foreground">{b.nome}</h3>
                      <Badge tone="muted">{b.tipo}</Badge>
                      <Badge tone={b.situacao === "ativa" ? "success" : "danger"}>{optLabel(b.situacao)}</Badge>
                      {b.baseSuperiorId ? <Badge tone="primary">Base superior: {baseById.get(b.baseSuperiorId)?.nome ?? "não encontrada"}</Badge> : null}
                      {!b.cnpj ? <Badge tone="warning">Sem CNPJ</Badge> : <span className="text-xs text-app-muted-foreground">{formatCnpj(b.cnpj)}</span>}
                    </div>
                    {canManage && !clienteEncerrado ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <BaseStatusActions
                        base={b}
                        childBaseNames={childBases.map((child) => child.nome)}
                        moduleCount={mods.filter((modulo) => modulo.baseId === b.id || childBases.some((child) => child.id === modulo.baseId)).length}
                      />
                      <BaseForm
                        municipioId={m.id}
                        bases={bs}
                        base={b}
                        trigger={
                          <button type="button" className={btnXsGhost} title="Editar base" aria-label={`Editar base ${b.nome}`}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                        }
                      />
                      {b.situacao === "ativa" ? (
                        <ModuloForm
                          baseId={b.id}
                          municipioId={m.id}
                          modulos={bMods.map((modulo) => ({ nome: modulo.nome }))}
                          hasChildBases={childBases.length > 0}
                          trigger={
                            <button type="button" className={btnXsGhost}>
                              <Plus className="h-3.5 w-3.5" /> Novo módulo
                            </button>
                          }
                        />
                      ) : null}
                    </div>
                    ) : null}
                  </header>
                  {b.situacao !== "ativa" ? (
                    <div className="border-b border-app-danger/30 bg-app-danger/5 px-4 py-2 text-xs text-app-danger">
                      Desabilitada{b.desabilitadoAt ? ` em ${formatDate(b.desabilitadoAt)}` : ""}
                      {b.desabilitadoMotivo ? ` — ${b.desabilitadoMotivo}` : ""}
                      {b.desabilitacaoOrigemBaseId && b.desabilitacaoOrigemBaseId !== b.id
                        ? ` · Desabilitada pela base ${baseById.get(b.desabilitacaoOrigemBaseId)?.nome ?? "superior"}`
                        : ""}
                    </div>
                  ) : null}
                  {b.observacoes ? <p className="whitespace-pre-wrap px-4 py-2 text-sm text-app-muted-foreground">{b.observacoes}</p> : null}
                  {childBases.length > 0 ? (
                    <p className="border-b border-app-border px-4 py-2 text-xs text-app-muted-foreground">
                      Bases inferiores: {childBases.map((child) => child.nome).join(", ")}
                    </p>
                  ) : null}
                  <div className="flex flex-col divide-y divide-app-border">
                    {bMods.length === 0 ? (
                      <p className="px-4 py-4 text-xs text-app-muted-foreground">Nenhum módulo nesta base.</p>
                    ) : (
                      bMods.map((mo) => {
                        const contratado = conSet.has(mo.id);
                        const state = moduloState(mo, contratado);
                        const rMods = responsaveisByModuloId.get(mo.id) ?? [];
                        const contratosVinculados = cms
                          .filter((cm) => cm.baseModuleId === mo.id)
                          .map((cm) => contratoById.get(cm.contratoId))
                          .filter((contrato): contrato is NonNullable<typeof contrato> => !!contrato);
                        return (
                          <div key={mo.id} className="flex flex-col gap-2.5 px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <ModuloDetailDialog
                                modulo={mo}
                                base={b}
                                municipioId={m.id}
                                state={state}
                                contratado={contratado}
                                contratos={contratosVinculados}
                                responsaveis={rMods}
                                actions={moduloActionHandlers}
                                readOnly={!canManage || clienteEncerrado || b.situacao !== "ativa"}
                              />
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
                            {mo.observacoes ? <p className="whitespace-pre-wrap text-sm text-app-muted-foreground">{mo.observacoes}</p> : null}
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

      {/* Responsaveis */}
      <Panel>
        <PanelHeader
          title="Responsáveis"
          description="Contatos vinculados aos módulos do cliente"
          right={
            !canManage || clienteEncerrado ? null : modulosResponsavelOptions.length > 0 ? (
              <ResponsavelModuloForm
                municipioId={m.id}
                modulos={modulosResponsavelOptions}
                trigger={
                  <button type="button" className={btnPrimary}>
                    <Plus className="h-4 w-4" /> Novo responsável
                  </button>
                }
              />
            ) : (
              <button type="button" disabled className={btnPrimary}>
                <Plus className="h-4 w-4" /> Novo responsável
              </button>
            )
          }
        />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {responsaveis.length === 0 ? (
            <Empty title="Nenhum responsável" description="Cadastre responsáveis depois de criar módulos." />
          ) : (
            responsaveis.map((responsavel) => {
              const modulo = modById.get(responsavel.baseModuleId);
              const base = modulo ? baseById.get(modulo.baseId) : null;
              const hasContato = !!responsavel.email || !!responsavel.celular;
              return (
                <div key={responsavel.id} className="flex flex-wrap items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-app-foreground">{responsavel.nome}</p>
                      <Badge tone="muted">{base?.nome ?? "Base não encontrada"}</Badge>
                      <Badge tone="primary">{modulo?.nome ?? "Módulo não encontrado"}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted-foreground">
                      {responsavel.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {responsavel.email}
                        </span>
                      ) : null}
                      {responsavel.celular ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {formatPhone(responsavel.celular)}
                        </span>
                      ) : null}
                      {!hasContato ? <span>Contato pendente</span> : null}
                    </div>
                  </div>
                  {canManage && !clienteEncerrado ? (
                  <div className="flex items-center gap-1">
                    <ResponsavelModuloForm
                      municipioId={m.id}
                      modulos={modulosResponsavelOptions}
                      responsavel={responsavel}
                      trigger={
                        <button type="button" className={btnXsGhost} title="Editar responsável" aria-label="Editar responsável">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                      }
                    />
                    <DeleteResponsavelModuloForm
                      responsavel={responsavel}
                      trigger={
                        <button type="button" className={btnXsGhost} title="Deletar responsável" aria-label="Deletar responsável">
                          <Trash2 className="h-3.5 w-3.5 text-app-danger" /> Deletar
                        </button>
                      }
                    />
                  </div>
                  ) : null}
                </div>
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
            !canManage || clienteEncerrado ? null : (
              <ContratoForm
                municipioId={m.id}
                bases={bs.filter((base) => base.situacao === "ativa").map((b) => ({ id: b.id, municipioId: b.municipioId, nome: b.nome, tipo: b.tipo }))}
                modulos={mods.filter((modulo) => baseById.get(modulo.baseId)?.situacao === "ativa").map((modulo) => ({ id: modulo.id, baseId: modulo.baseId, nome: modulo.nome }))}
                occupiedBaseIds={[...occupiedBaseIds(cms, mods)]}
                trigger={
                  <button type="button" className={btnPrimary}>
                    <Plus className="h-4 w-4" /> Novo contrato
                  </button>
                }
              />
            )
          }
        />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {cs.length === 0 ? (
            <Empty title="Nenhum contrato" description="Cadastre quando houver formalização." />
          ) : (
            cs.map((c) => {
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
                      {cobertura} módulo(s) contemplado(s){c.processo ? ` · Processo ${c.processo}` : ""}
                    </p>
                  </div>
                  <Badge tone="primary">{cobertura} módulo(s)</Badge>
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
              <Link href="/propostas" className={btnXsGhost}>Abrir central de propostas</Link>
            }
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {props.length === 0 ? (
              <Empty title="Nenhuma proposta" />
            ) : (
              props.map((p) => (
                <Link href={`/propostas/${p.id}`} key={p.id} className="block rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5 hover:border-app-primary/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-app-foreground">{optLabel(p.tipo)}</p>
                    <Badge tone={optTone(p.situacao)}>{optLabel(p.situacao)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-app-muted-foreground">
                    {formatDate(p.data)}
                    {p.basesEnvolvidas ? ` · Bases: ${p.basesEnvolvidas}` : ""}
                    {p.modulosEnvolvidos ? ` · Módulos: ${p.modulosEnvolvidos}` : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Panel>

        {/* Documentos */}
        <Panel>
          <PanelHeader
            title="Documentos"
            right={
              !canManage || clienteEncerrado ? null : (
                <DocumentoForm
                  municipioId={m.id}
                  contratos={cs.map((c) => ({ id: c.id, numero: c.numero }))}
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
            {visibleDocsList.length === 0 ? (
              <Empty title="Nenhum documento" description="Anexe contratos, propostas, atas e evidências." />
            ) : (
              visibleDocsList.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-foreground">{d.nome}</p>
                    <p className="truncate text-xs text-app-muted-foreground">
                      {d.arquivoNomeOriginal ?? d.referencia ?? "Sem arquivo armazenado"}
                      {d.contratoId ? ` · Contrato ${contratoById.get(d.contratoId)?.numero ?? ""}` : ""}
                      {d.aditivoId ? " · Aditivo" : ""}
                      {d.propostaId ? ` · Proposta ${optLabel(propostaById.get(d.propostaId)?.tipo)}` : ""}
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Pendências */}
        <Panel>
          <PanelHeader title="Pendências" description="Resolvidas automaticamente quando a condição é corrigida no sistema" />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {pendsAbertas.length === 0 ? (
              <Empty title="Nenhuma pendência aberta" />
            ) : (
              pendsAbertas.map((p) => (
                  <div key={p.id} className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                    <div className="flex flex-wrap items-start gap-2">
                      <Badge tone={PENDENCIA_TIPOS[p.tipo]?.tone ?? "muted"}>{PENDENCIA_TIPOS[p.tipo]?.label ?? p.tipo}</Badge>
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
          <PanelHeader title="Linha do tempo" description="Toda ação relevante gera um evento" />
          <div className="flex max-h-[28rem] flex-col gap-0 overflow-y-auto p-3 sm:p-4">
            {eventosOperacionais.length === 0 ? (
              <Empty title="Sem eventos registrados" />
            ) : (
              eventosOperacionais.map((e, i) => {
                const eventModulo = e.baseModuleId ? modById.get(e.baseModuleId) : null;
                const eventBase = e.baseId ? baseById.get(e.baseId) : eventModulo ? baseById.get(eventModulo.baseId) : null;
                const eventContrato = e.contratoId ? contratoById.get(e.contratoId) : null;

                return (
                  <div key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < eventosOperacionais.length - 1 ? (
                      <span className="absolute left-[7px] top-5 h-full w-px bg-app-border" aria-hidden />
                    ) : null}
                    <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-app-primary bg-app-surface" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-app-muted-foreground">
                        {formatDate(e.data)} · {EVENTO_TIPOS[e.tipo] ?? e.tipo}
                      </p>
                      <p className="mt-0.5 text-sm text-app-foreground">{hideProposalIds(e.descricao)}</p>
                      <p className="mt-0.5 text-[11px] text-app-muted-foreground">
                        Registrado por {e.usuario}
                        {eventBase ? ` · Base ${eventBase.nome}` : ""}
                        {eventModulo ? ` · Módulo ${eventModulo.nome}` : ""}
                        {eventContrato ? ` · Contrato ${eventContrato.numero}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
