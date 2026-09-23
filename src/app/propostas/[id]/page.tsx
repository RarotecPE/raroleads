import { ArrowLeft, Building2, Download, Eye, FileUp, Mail, Pencil } from "lucide-react";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { documentos, propostaBases, propostaEspecificidades, propostaHistorico, propostaModulos, propostas } from "@/db/schema";
import { DialogForm, SubmitButton } from "@/components/dialog";
import { FileInput } from "@/components/file-input";
import { DocumentShareButton } from "@/components/document-share-button";
import { ProposalDecisionDialog } from "@/components/proposal-decision-dialog";
import { ProposalManualSendDialog } from "@/components/proposal-manual-send-dialog";
import { ProposalCancelDialog, ProposalDeleteDialog } from "@/components/proposal-cancel-delete-dialogs";
import { Badge, Empty, Field, Panel, PanelHeader, YesNo, btnGhost, btnPrimary, btnXsGhost, inputCls } from "@/components/ui";
import { enviarProposta, materializarCadastrosProposta, uploadPropostaDocumento } from "@/lib/proposal-actions";
import { getCurrentSession } from "@/lib/auth";
import { optLabel, optTone } from "@/lib/constants";
import { isDocumentViewable } from "@/lib/document-view";
import { propostaHistoricoAcaoLabel, propostaStatusLabel } from "@/lib/proposal";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PropostaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[proposal], proposalBaseRows, proposalModuleRows, specs, docs, history, session] = await Promise.all([
    db.select().from(propostas).where(and(eq(propostas.id, id), isNull(propostas.excluidaAt))),
    db.select().from(propostaBases).where(eq(propostaBases.propostaId, id)),
    db.select().from(propostaModulos).innerJoin(propostaBases, eq(propostaModulos.propostaBaseId, propostaBases.id)).where(eq(propostaBases.propostaId, id)),
    db.select().from(propostaEspecificidades).where(eq(propostaEspecificidades.propostaId, id)),
    db.select().from(documentos).where(eq(documentos.propostaId, id)).orderBy(desc(documentos.propostaVersao), desc(documentos.createdAt)),
    db.select().from(propostaHistorico).where(eq(propostaHistorico.propostaId, id)).orderBy(desc(propostaHistorico.createdAt)),
    getCurrentSession(),
  ]);
  if (!proposal) notFound();
  const canManage = session?.permissions.manage === true;
  const hasPendingRecords = proposalBaseRows.some((base) => !base.baseId) || proposalModuleRows.some((row) => !row.proposta_modulos.baseModuleId);
  const needsMaterialization = !proposal.municipioId || hasPendingRecords;
  const canEdit = canManage && (proposal.situacao === "solicitada" || proposal.situacao === "em_retificacao");

  return <div className="flex flex-col gap-5">
    <Panel className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/propostas" className="mb-3 inline-flex items-center gap-1 text-xs text-app-muted-foreground hover:text-app-primary"><ArrowLeft className="h-3.5 w-3.5" /> Central de propostas</Link><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-app-foreground">{proposal.clienteNomeSnapshot}</h2><Badge tone={optTone(proposal.situacao)}>{optLabel(proposal.situacao)}</Badge><Badge tone={optTone(proposal.tipo)}>{optLabel(proposal.tipo)}</Badge></div><p className="mt-1 text-sm text-app-muted-foreground">{proposal.municipioNome}/{proposal.uf} · Solicitada em {formatDate(proposal.data)}</p></div>{canManage ? <div className="flex flex-wrap gap-2">{canEdit ? <Link href={`/propostas/${id}/editar`} className={btnGhost}><Pencil className="h-4 w-4" /> Editar proposta</Link> : null}{proposal.situacao === "solicitada" ? <ProposalCancelDialog id={id} /> : null}{proposal.situacao === "cancelada" ? <ProposalDeleteDialog id={id} /> : null}</div> : null}</div></Panel>

    {proposal.situacao === "cancelada" ? <Panel className="border-app-danger/40"><PanelHeader title="Proposta cancelada" description="Esta proposta não pode mais ser editada ou processada" /><div className="space-y-1 p-4 text-sm"><p className="text-app-foreground"><span className="font-semibold">Motivo:</span> {proposal.cancelamentoMotivo}</p><p className="text-xs text-app-muted-foreground">Cancelada em {formatDateTime(proposal.canceladaAt)} por {proposal.canceladaPor ?? "Equipe Interna"}.</p></div></Panel> : null}

    {canManage && (proposal.situacao === "solicitada" || proposal.situacao === "em_retificacao") ? <Panel><PanelHeader title={proposal.situacao === "em_retificacao" ? "Anexar versão retificada" : "Gerar proposta"} description="O documento será preservado como uma versão da proposta" /><DialogForm action={uploadPropostaDocumento} className="p-4"><input type="hidden" name="id" value={id} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do documento"><input name="nome" className={inputCls} placeholder="Proposta comercial" /></Field><Field label="Arquivo" hint="Documentos e imagens até 20 MB"><FileInput name="arquivo" required /></Field></div><div className="flex justify-end"><SubmitButton className={btnPrimary}><FileUp className="h-4 w-4" /> Anexar e marcar como gerada</SubmitButton></div></DialogForm></Panel> : null}

    {canManage && proposal.situacao === "gerada" ? <Panel><PanelHeader title="Enviar proposta" description="Envie por e-mail ou registre o envio realizado por outro meio" /><DialogForm action={enviarProposta} className="grid gap-4 p-4 sm:grid-cols-2"><input type="hidden" name="id" value={id} /><Field label="Nome do destinatário"><input name="destinatarioNome" required className={inputCls} /></Field><Field label="E-mail do destinatário"><input name="destinatarioEmail" type="email" required className={inputCls} /></Field><div className="flex justify-end sm:col-span-2"><SubmitButton className={btnPrimary}><Mail className="h-4 w-4" /> Enviar proposta</SubmitButton></div></DialogForm><div className="flex flex-wrap justify-end gap-2 border-t border-app-border p-4"><ProposalDecisionDialog id={id} status="em_retificacao" /><ProposalManualSendDialog id={id} /></div></Panel> : null}

    {canManage && proposal.situacao === "enviada" ? <Panel><PanelHeader title="Registrar retorno do cliente" /><div className="flex flex-wrap gap-2 p-4"><ProposalDecisionDialog id={id} status="aceita" canCreateRecords={needsMaterialization} /><ProposalDecisionDialog id={id} status="recusada" /><ProposalDecisionDialog id={id} status="em_retificacao" /></div></Panel> : null}

    {canManage && proposal.situacao === "aceita" && needsMaterialization ? <Panel><PanelHeader title="Cadastros pendentes" description="Ainda existem cliente, bases ou módulos da proposta sem vínculo cadastral" /><DialogForm action={materializarCadastrosProposta} className="p-4"><input type="hidden" name="id" value={id} /><p className="text-sm text-app-muted-foreground">Crie agora os registros restantes. Dados não disponíveis, como CNPJ e responsáveis, poderão ser preenchidos depois na área de clientes.</p><div className="flex justify-end"><SubmitButton className={btnPrimary}><Building2 className="h-4 w-4" /> Criar cliente, bases e módulos</SubmitButton></div></DialogForm></Panel> : null}

    <div className="grid gap-5 xl:grid-cols-2"><Panel><PanelHeader title="Escopo" /><div className="space-y-3 p-4">{proposalBaseRows.length ? proposalBaseRows.map((base) => <div key={base.id} className="rounded-app-md border border-app-border p-3"><p className="font-semibold text-app-foreground">{base.nome}</p><div className="mt-2 flex flex-wrap gap-2">{proposalModuleRows.filter((row) => row.proposta_modulos.propostaBaseId === base.id).map((row) => <Badge key={row.proposta_modulos.id} tone="primary">{row.proposta_modulos.nome}</Badge>)}</div></div>) : <><p className="text-sm text-app-muted-foreground">Bases: {proposal.basesEnvolvidas ?? "Não informadas"}</p><p className="text-sm text-app-muted-foreground">Módulos: {proposal.modulosEnvolvidos ?? "Não informados"}</p></>}{proposal.tipo === "consultoria" ? <div className="space-y-2 border-t border-app-border pt-3"><p className="text-xs font-semibold text-app-muted-foreground">Especificidades</p><div className="flex flex-wrap gap-2">{specs.map((spec) => <Badge key={spec.especificidade} tone="warning">{optLabel(spec.especificidade)}</Badge>)}</div><YesNo yes={proposal.atividadeConjunta === true} label="Atividade conjunta" /></div> : null}{proposal.observacoes ? <p className="whitespace-pre-wrap border-t border-app-border pt-3 text-sm text-app-muted-foreground">{proposal.observacoes}</p> : null}</div></Panel>
    <Panel><PanelHeader title="Documentos" /><div className="space-y-2 p-4">{docs.length === 0 ? <Empty title="Nenhum documento" /> : docs.map((doc) => <div key={doc.id} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border p-3"><div><p className="text-sm font-semibold text-app-foreground">Versão {doc.propostaVersao} · {doc.nome}</p><p className="text-xs text-app-muted-foreground">{formatDateTime(doc.createdAt)}</p></div><div className="flex flex-wrap gap-1">{isDocumentViewable(doc.mimeType, doc.arquivoNomeOriginal ?? doc.nome) ? <Link href={`/api/documentos/${doc.id}/view`} target="_blank" className={btnXsGhost}><Eye className="h-3.5 w-3.5" /> Visualizar</Link> : null}<Link href={`/api/documentos/${doc.id}/download`} className={btnXsGhost}><Download className="h-3.5 w-3.5" /> Baixar</Link><DocumentShareButton documentId={doc.id} fileName={doc.arquivoNomeOriginal ?? doc.nome} mimeType={doc.mimeType} /></div></div>)}</div></Panel></div>

    <Panel><PanelHeader title="Histórico da proposta" description="Ciclo de vida e tentativas operacionais" /><div className="space-y-0 p-4">{history.map((entry, index) => <div key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">{index < history.length - 1 ? <span className="absolute left-[7px] top-5 h-full w-px bg-app-border" /> : null}<span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-app-primary bg-app-surface" /><div className="min-w-0"><p className="text-sm font-bold text-app-foreground">{propostaHistoricoAcaoLabel(entry.acao)}</p><p className="mt-0.5 text-xs font-semibold text-app-muted-foreground">{formatDateTime(entry.createdAt)} · {entry.usuario}</p>{entry.statusAnterior && entry.statusNovo && entry.statusAnterior !== entry.statusNovo ? <p className="mt-1 text-xs text-app-muted-foreground">Status: <span className="font-semibold text-app-foreground">{propostaStatusLabel(entry.statusAnterior)}</span> → <span className="font-semibold text-app-foreground">{propostaStatusLabel(entry.statusNovo)}</span></p> : null}<p className="mt-1 text-sm text-app-foreground">{entry.descricao}</p>{entry.destinatarioEmail ? <p className="mt-1 text-xs text-app-muted-foreground">Destinatário: {entry.destinatarioEmail}</p> : null}</div></div>)}</div></Panel>
  </div>;
}
