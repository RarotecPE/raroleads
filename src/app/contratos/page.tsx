import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { baseModules, bases, contratoModulos, contratos, municipios } from "@/db/schema";
import { ContratoForm } from "@/components/contrato-form";
import { Badge, Empty, Panel, PanelHeader, Stat, btnPrimary, btnSecondary, selectCls } from "@/components/ui";
import { CONTRATO_DERIVADAS, CONTRATO_SITUACOES, optLabel } from "@/lib/constants";
import { contratoView } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; s?: string }>;
}) {
  const { cliente, s } = await searchParams;
  const [session, cs, ms, cms, bs, mods] = await Promise.all([
    getCurrentSession(),
    db.select().from(contratos),
    db.select().from(municipios),
    db.select().from(contratoModulos),
    db.select().from(bases),
    db.select().from(baseModules),
  ]);
  const canManage = session?.permissions.manage === true;

  const munById = new Map(ms.map((m) => [m.id, m]));
  const clientesComContrato = new Set(cs.map((c) => c.municipioId));
  const clientesFiltro = ms
    .filter((m) => clientesComContrato.has(m.id))
    .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"));
  const situacoesFiltro = [
    ...CONTRATO_SITUACOES.map(({ value, label }) => ({ value, label })),
    ...Object.entries(CONTRATO_DERIVADAS).map(([value, option]) => ({ value, label: option.label })),
  ];
  const clienteSelecionado = cliente && clientesComContrato.has(cliente) ? cliente : "";
  const situacaoSelecionada = s && situacoesFiltro.some((option) => option.value === s) ? s : "";
  const views = cs.map((c) => ({ c, view: contratoView(c) }));
  const ativos = cs.filter((c) => c.situacao === "vigente").length;
  const vencendo = views.filter((v) => v.view.value === "proximo_vencimento").length;
  const vencidos = views.filter((v) => v.view.value === "vencido").length;
  const semAssinatura = cs.filter((c) =>
    ["recebido_sem_assinatura", "aguardando_assinatura"].includes(c.situacao),
  ).length;

  const ordenados = views
    .filter(({ c, view }) =>
      (!clienteSelecionado || c.municipioId === clienteSelecionado) &&
      (!situacaoSelecionada || view.value === situacaoSelecionada),
    )
    .sort((a, b) => (a.view.daysLeft ?? 99999) - (b.view.daysLeft ?? 99999));

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
          right={canManage ? (
            <ContratoForm
              municipios={ms.map((m) => ({ id: m.id, nome: m.clienteNome }))}
              bases={bs.map((b) => ({ id: b.id, municipioId: b.municipioId, nome: b.nome, tipo: b.tipo }))}
              modulos={mods.map((modulo) => ({ id: modulo.id, baseId: modulo.baseId, nome: modulo.nome }))}
              trigger={
                <button type="button" className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Novo contrato
                </button>
              }
            />
          ) : null}
        />
        <form method="get" action="/contratos" className="flex flex-wrap items-end gap-3 border-b border-app-border px-4 py-3 sm:px-5">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-app-muted-foreground sm:max-w-xs">
            Cliente
            <select name="cliente" defaultValue={clienteSelecionado} className={selectCls}>
              <option value="">Todos os clientes</option>
              {clientesFiltro.map((m) => (
                <option key={m.id} value={m.id}>{m.clienteNome}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-app-muted-foreground sm:max-w-xs">
            Situação
            <select name="s" defaultValue={situacaoSelecionada} className={selectCls}>
              <option value="">Todas as situações</option>
              {situacoesFiltro.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={btnPrimary}>Filtrar</button>
          <Link href="/contratos" className={btnSecondary}>Limpar</Link>
        </form>
        <div className="overflow-x-auto">
          {ordenados.length === 0 ? (
            <div className="p-5">
              {cs.length === 0 ? (
                <Empty title="Nenhum contrato cadastrado" />
              ) : (
                <Empty title="Nenhum contrato encontrado" description="Nenhum contrato corresponde aos filtros selecionados." />
              )}
            </div>
          ) : (
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Contrato", "Cliente", "Modalidade", "Vigencia", "Modulos", "Situacao"].map((h) => (
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
                      {munById.get(c.municipioId)?.clienteNome ?? "-"}
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
