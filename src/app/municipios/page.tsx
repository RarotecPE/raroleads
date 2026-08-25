import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { baseModules, bases, contratos, municipios, pendencias } from "@/db/schema";
import { MunicipioForm } from "@/components/municipio-form";
import { Badge, Empty, Panel, PanelHeader, btnPrimary } from "@/components/ui";
import { MUNICIPIO_SITUACOES, optLabel, optTone } from "@/lib/constants";
import { syncPendencias } from "@/lib/domain";
import { cn, countBy, norm } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MunicipiosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string }>;
}) {
  await syncPendencias();
  const { q, s } = await searchParams;

  const [ms, bs, mods, cs, pends] = await Promise.all([
    db.select().from(municipios),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select().from(contratos),
    db.select().from(pendencias),
  ]);

  const basePorMun = countBy(bs, (b) => b.municipioId);
  const baseById = new Map(bs.map((b) => [b.id, b]));
  const modsPorMun = countBy(mods, (m) => baseById.get(m.baseId)?.municipioId ?? "");
  const contratosAtivos = countBy(
    cs.filter((c) => c.situacao === "vigente"),
    (c) => c.municipioId,
  );
  const pendsAbertas = countBy(
    pends.filter((p) => p.situacao === "aberta"),
    (p) => p.municipioId ?? "",
  );
  const filtro = (q ?? "").trim().toLowerCase();
  const lista = ms
    .filter((m) => (s ? m.situacao === s : true))
    .filter((m) => (filtro ? norm(m.nome).includes(norm(filtro)) : true))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Municípios"
          description="O município é o agrupador principal do sistema"
          right={
            <MunicipioForm
              trigger={
                <button type="button" className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Novo município
                </button>
              }
            />
          }
        />
        <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <form className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted-foreground" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar município…"
              aria-label="Buscar município"
              className="h-10 w-full rounded-app-md border border-app-border bg-app-surface pl-9 pr-3 text-sm text-app-foreground placeholder:text-app-muted-foreground focus-visible:outline-none"
            />
            {s ? <input type="hidden" name="s" value={s} /> : null}
          </form>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href="/municipios"
              className={cn(
                "rounded-app-pill px-3 py-1.5 text-xs font-semibold transition-colors",
                !s ? "bg-app-primary/15 text-app-primary" : "text-app-muted-foreground hover:bg-app-surface-elevated",
              )}
            >
              Todos
            </Link>
            {MUNICIPIO_SITUACOES.map((sit) => (
              <Link
                key={sit.value}
                href={`/municipios?s=${sit.value}`}
                className={cn(
                  "rounded-app-pill px-3 py-1.5 text-xs font-semibold transition-colors",
                  s === sit.value ? "bg-app-primary/15 text-app-primary" : "text-app-muted-foreground hover:bg-app-surface-elevated",
                )}
              >
                {sit.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {lista.length === 0 ? (
            <div className="p-5">
              <Empty title="Nenhum município encontrado" description="Cadastre o primeiro município para começar." />
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-app-border">
                  {["Município", "Situação", "Bases", "Módulos", "Contratos vigentes", "Pendências"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id} className="border-b border-app-border transition-colors last:border-0 hover:bg-app-surface-elevated/50">
                    <td className="px-4 py-3 sm:px-5">
                      <Link href={`/municipios/${m.id}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">
                        <Building2 className="mr-1.5 inline h-4 w-4 text-app-muted-foreground" />
                        {m.nome}
                        <span className="ml-1.5 text-xs font-medium text-app-muted-foreground">{m.uf}</span>
                      </Link>
                      {m.codigoIbge ? <p className="mt-0.5 text-xs text-app-muted-foreground">IBGE {m.codigoIbge}</p> : null}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <Badge tone={optTone(m.situacao)}>{optLabel(m.situacao)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{basePorMun.get(m.id) ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{modsPorMun.get(m.id) ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{contratosAtivos.get(m.id) ?? 0}</td>
                    <td className="px-4 py-3 sm:px-5">
                      {(pendsAbertas.get(m.id) ?? 0) > 0 ? (
                        <Badge tone="warning">{pendsAbertas.get(m.id)} abertas</Badge>
                      ) : (
                        <span className="text-sm text-app-muted-foreground">—</span>
                      )}
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
