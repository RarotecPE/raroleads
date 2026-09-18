import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { baseModules, bases, contratoModulos, contratos, documentos, municipios } from "@/db/schema";
import { ContratoForm } from "@/components/contrato-form";
import { Empty, Panel, PanelHeader, Stat, btnPrimary, btnSecondary, selectCls } from "@/components/ui";
import { optLabel } from "@/lib/constants";
import { getCurrentSession } from "@/lib/auth";
import { occupiedBaseIds } from "@/lib/contract-reference";

export const dynamic = "force-dynamic";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const [session, cs, ms, cms, bs, mods, docs] = await Promise.all([
    getCurrentSession(),
    db.select().from(contratos),
    db.select().from(municipios),
    db.select().from(contratoModulos),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select().from(documentos),
  ]);
  const canManage = session?.permissions.manage === true;
  const munById = new Map(ms.map((m) => [m.id, m]));
  const clientesComContrato = new Set(cs.map((c) => c.municipioId));
  const clientesFiltro = ms
    .filter((m) => clientesComContrato.has(m.id))
    .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"));
  const clienteSelecionado = cliente && clientesComContrato.has(cliente) ? cliente : "";
  const baseByModuleId = new Map(mods.map((modulo) => [modulo.id, modulo.baseId]));
  const basesCobertas = new Set(cms.map((cm) => baseByModuleId.get(cm.baseModuleId)).filter((id): id is string => !!id));
  const modulosCobertos = new Set(cms.map((cm) => cm.baseModuleId));
  const basesOcupadas = [...occupiedBaseIds(cms, mods)];
  const ordenados = cs
    .filter((c) => !clienteSelecionado || c.municipioId === clienteSelecionado)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contratos" value={cs.length} tone="primary" />
        <Stat label="Clientes com contrato" value={clientesComContrato.size} tone="success" />
        <Stat label="Bases contempladas" value={basesCobertas.size} tone="primary" />
        <Stat label="Módulos contemplados" value={modulosCobertos.size} tone="primary" />
      </div>

      <Panel>
        <PanelHeader
          title="Contratos"
          description="Documentos e módulos contemplados por cliente e base"
          right={canManage ? (
            <ContratoForm
              municipios={ms.map((m) => ({ id: m.id, nome: m.clienteNome }))}
              bases={bs.map((b) => ({ id: b.id, municipioId: b.municipioId, nome: b.nome, tipo: b.tipo }))}
              modulos={mods.map((modulo) => ({ id: modulo.id, baseId: modulo.baseId, nome: modulo.nome }))}
              occupiedBaseIds={basesOcupadas}
              trigger={<button type="button" className={btnPrimary}><Plus className="h-4 w-4" /> Novo contrato</button>}
            />
          ) : null}
        />
        <form method="get" action="/contratos" className="flex flex-wrap items-end gap-3 border-b border-app-border px-4 py-3 sm:px-5">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-app-muted-foreground sm:max-w-xs">
            Cliente
            <select name="cliente" defaultValue={clienteSelecionado} className={selectCls}>
              <option value="">Todos os clientes</option>
              {clientesFiltro.map((m) => <option key={m.id} value={m.id}>{m.clienteNome}</option>)}
            </select>
          </label>
          <button type="submit" className={btnPrimary}>Filtrar</button>
          <Link href="/contratos" className={btnSecondary}>Limpar</Link>
        </form>
        <div className="overflow-x-auto">
          {ordenados.length === 0 ? (
            <div className="p-5">
              {cs.length === 0 ? <Empty title="Nenhum contrato cadastrado" /> : <Empty title="Nenhum contrato encontrado" />}
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Contrato", "Cliente", "Modalidade", "Bases", "Módulos", "Anexos"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenados.map((c) => {
                  const vinculos = cms.filter((cm) => cm.contratoId === c.id);
                  const basesDoContrato = new Set(vinculos.map((cm) => baseByModuleId.get(cm.baseModuleId)).filter((id): id is string => !!id));
                  return (
                    <tr key={c.id} className="border-b border-app-border transition-colors last:border-0 hover:bg-app-surface-elevated/50">
                      <td className="px-4 py-3 sm:px-5">
                        <Link href={`/contratos/${c.id}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">
                          <FileText className="mr-1.5 inline h-4 w-4 text-app-muted-foreground" />{c.numero}
                        </Link>
                        {c.processo ? <p className="mt-0.5 text-xs text-app-muted-foreground">Proc. {c.processo}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">{munById.get(c.municipioId)?.clienteNome ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">{optLabel(c.modalidade)}</td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{basesDoContrato.size}</td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{vinculos.length}</td>
                      <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{docs.filter((doc) => doc.contratoId === c.id).length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
