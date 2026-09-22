import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { baseModules, bases, contratoModulos, municipios } from "@/db/schema";
import { ProposalRequestForm } from "@/components/proposal-request-form";
import { Panel, PanelHeader, btnGhost } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NovaPropostaPage() {
  const [clientes, baseRows, moduleRows, contractedRows, session] = await Promise.all([db.select().from(municipios), db.select().from(bases), db.select().from(baseModules), db.select({ baseModuleId: contratoModulos.baseModuleId }).from(contratoModulos), getCurrentSession()]);
  if (!session?.permissions.manage) redirect("/propostas");
  return <div className="flex flex-col gap-5"><Panel><PanelHeader title="Solicitar proposta" description="Defina a modalidade, o cliente e o escopo comercial" right={<Link href="/propostas" className={btnGhost}><ArrowLeft className="h-4 w-4" /> Voltar</Link>} /><div className="p-4 sm:p-5"><ProposalRequestForm clientes={clientes.map((client) => ({ id: client.id, nome: client.clienteNome, municipio: client.municipio, uf: client.uf, codigoIbge: client.codigoIbge, situacao: client.situacao }))} bases={baseRows.map((base) => ({ id: base.id, municipioId: base.municipioId, nome: base.nome, tipo: base.tipo }))} modulos={moduleRows.map((module) => ({ id: module.id, baseId: module.baseId, nome: module.nome }))} contractedModuleIds={[...new Set(contractedRows.map((row) => row.baseModuleId))]} /></div></Panel></div>;
}
