import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { contratoModulos, contratos, municipios } from "@/db/schema";
import { ContratoForm } from "@/components/contrato-form";
import { Badge, Empty, Panel, PanelHeader, Stat, btnPrimary } from "@/components/ui";
import { optLabel } from "@/lib/constants";
import { contratoView, syncPendencias } from "@/lib/domain";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  await syncPendencias();
  const [cs, ms, cms] = await Promise.all([
    db.select().from(contratos),
    db.select().from(municipios),
    db.select().from(contratoModulos),
  ]);

  const munById = new Map(ms.map((m) => [m.id, m]));
  const views = cs.map((c) => ({ c, view: contratoView(c) }));
  const ativos = cs.filter((c) => c.situacao === "vigente").length;
  const vencendo = views.filter((v) => v.view.value === "proximo_vencimento").length;
  const vencidos = views.filter((v) => v.view.value === "vencido").length;
  const semAssinatura = cs.filter((c) =>
    ["recebido_sem_assinatura", "aguardando_assinatura"].includes(c.situacao),
  ).length;

  const ordenados = views.sort((a, b) => (a.view.daysLeft ?? 99999) - (b.view.daysLeft ?? 99999));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contratos ativos" value={ativos} tone="success" />
        <Stat label="Próximos do vencimento" value={vencendo} tone="warning" hint="≤ 60 dias" />
        <Stat label="Vencidos" value={vencidos} tone="danger" />
        <Stat label="Sem assinatura" value={semAssinatura} tone="warning" />
      </div>

      <Panel>
        <PanelHeader
          title="Contratos"
          description="Um contrato pode contemplar múltiplas bases e módulos"
          right={
            <ContratoForm
              municipios={ms.map((m) => ({ id: m.id, nome: m.nome }))}
              trigger={
                <button type="button" className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Novo contrato
                </button>
              }
            />
          }
        />
        <div className="overflow-x-auto">
          {ordenados.length === 0 ? (
            <div className="p-5">
              <Empty title="Nenhum contrato cadastrado" />
            </div>
          ) : (
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Contrato", "Município", "Modalidade", "Vigência", "Módulos", "Situação"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenados.map(({ c, view }) => (
                  <tr key={c.id} className="border-b border-app-border transition-colors last:border-0 hover:bg-app-surface-elevated/50">
                    <td className="px-4 py-3 sm:px-5">
                      <Link href={`/contratos/${c.id}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">
                        <FileText className="mr-1.5 inline h-4 w-4 text-app-muted-foreground" />
                        {c.numero}
                      </Link>
                      {c.processo ? <p className="mt-0.5 text-xs text-app-muted-foreground">Proc. {c.processo}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">
                      {munById.get(c.municipioId)?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground sm:px-5">{optLabel(c.modalidade)}</td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground whitespace-nowrap sm:px-5">
                      {formatDate(c.dataInicio)} → {formatDate(c.dataFim)}
                    </td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">
                      {cms.filter((cm) => cm.contratoId === c.id).length}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <Badge tone={view.tone}>{view.label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
