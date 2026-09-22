import { ArrowLeft } from "lucide-react";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProposalRequestForm, type ProposalFormInitialData } from "@/components/proposal-request-form";
import { Panel, PanelHeader, btnGhost } from "@/components/ui";
import { db } from "@/db";
import { baseModules, bases, contratoModulos, municipios, propostaBases, propostaEspecificidades, propostaModulos, propostas } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[proposal], proposalBaseRows, especificidades, clientes, baseRows, moduleRows, contractedRows, session] = await Promise.all([
    db.select().from(propostas).where(eq(propostas.id, id)),
    db.select().from(propostaBases).where(eq(propostaBases.propostaId, id)),
    db.select().from(propostaEspecificidades).where(eq(propostaEspecificidades.propostaId, id)),
    db.select().from(municipios),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select({ baseModuleId: contratoModulos.baseModuleId }).from(contratoModulos),
    getCurrentSession(),
  ]);
  if (!proposal) notFound();
  if (!session?.permissions.manage) redirect(`/propostas/${id}`);
  if (proposal.situacao !== "solicitada" && proposal.situacao !== "em_retificacao") redirect(`/propostas/${id}`);

  const proposalModuleRows = proposalBaseRows.length
    ? await db.select().from(propostaModulos).where(inArray(propostaModulos.propostaBaseId, proposalBaseRows.map((base) => base.id)))
    : [];
  const initialData: ProposalFormInitialData = {
    id: proposal.id,
    tipo: proposal.tipo as ProposalFormInitialData["tipo"],
    municipioId: proposal.municipioId,
    clienteNomeSnapshot: proposal.clienteNomeSnapshot,
    municipioNome: proposal.municipioNome,
    uf: proposal.uf,
    codigoIbge: proposal.codigoIbge,
    atividadeConjunta: proposal.atividadeConjunta,
    observacoes: proposal.observacoes,
    especificidades: especificidades.map((item) => item.especificidade),
    items: proposalBaseRows.map((base) => ({
      id: base.id,
      baseId: base.baseId,
      nome: base.nome,
      tipo: base.tipo,
      modulos: proposalModuleRows.filter((module) => module.propostaBaseId === base.id).map((module) => ({ baseModuleId: module.baseModuleId, nome: module.nome })),
    })),
  };

  return <div className="flex flex-col gap-5"><Panel><PanelHeader title="Editar proposta" description="Atualize os dados e o escopo antes de gerar a próxima versão" right={<Link href={`/propostas/${id}`} className={btnGhost}><ArrowLeft className="h-4 w-4" /> Voltar</Link>} /><div className="p-4 sm:p-5"><ProposalRequestForm initialData={initialData} clientes={clientes.filter((client) => client.situacao !== "cliente_encerrado").map((client) => ({ id: client.id, nome: client.clienteNome, municipio: client.municipio, uf: client.uf }))} bases={baseRows.map((base) => ({ id: base.id, municipioId: base.municipioId, nome: base.nome, tipo: base.tipo }))} modulos={moduleRows.map((module) => ({ id: module.id, baseId: module.baseId, nome: module.nome }))} contractedModuleIds={[...new Set(contractedRows.map((row) => row.baseModuleId))]} /></div></Panel></div>;
}
