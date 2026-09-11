import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { baseModules, bases, contratos, municipios, pendencias } from "@/db/schema";
import { PendenciasClienteFilter } from "@/components/pendencias-cliente-filter";
import { Badge, Empty, Panel, PanelHeader, Stat } from "@/components/ui";
import { PENDENCIA_TIPOS } from "@/lib/constants";
import { syncPendencias } from "@/lib/domain";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTROS = [
  { value: "abertas", label: "Abertas" },
  { value: "resolvidas", label: "Resolvidas" },
  { value: "todas", label: "Todas" },
];

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; cliente?: string }>;
}) {
  await syncPendencias();
  const { s, cliente } = await searchParams;
  const filtro = s ?? "abertas";

  const [pends, ms, bs, mods, cs] = await Promise.all([
    db.select().from(pendencias).orderBy(desc(pendencias.createdAt)),
    db.select().from(municipios),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select().from(contratos),
  ]);

  const munById = new Map(ms.map((m) => [m.id, m]));
  const baseById = new Map(bs.map((b) => [b.id, b]));
  const modById = new Map(mods.map((m) => [m.id, m]));
  const conById = new Map(cs.map((c) => [c.id, c]));
  const clientesOrdenados = ms
    .map((m) => ({ id: m.id, nome: m.clienteNome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const clienteSelecionado = cliente && munById.has(cliente) ? cliente : "";

  const pendenciasComContexto = pends.map((p) => {
    const mod = p.baseModuleId ? modById.get(p.baseModuleId) : undefined;
    const base = p.baseId ? baseById.get(p.baseId) : mod ? baseById.get(mod.baseId) : undefined;
    const con = p.contratoId ? conById.get(p.contratoId) : undefined;
    const municipioId = p.municipioId ?? base?.municipioId ?? con?.municipioId ?? null;
    const mun = municipioId ? munById.get(municipioId) : undefined;
    return { p, mun, base, mod, con, municipioId };
  });

  const abertas = pends.filter((p) => p.situacao === "aberta");
  const resolvidas = pends.filter((p) => p.situacao === "resolvida");
  const clientesComPendenciasAbertas = new Set(
    pendenciasComContexto
      .filter(({ p, municipioId }) => p.situacao === "aberta" && municipioId)
      .map(({ municipioId }) => municipioId),
  );
  const lista = pendenciasComContexto.filter(({ p, municipioId }) => {
    const matchesSituacao =
      filtro === "todas" ? true : filtro === "resolvidas" ? p.situacao === "resolvida" : p.situacao === "aberta";
    const matchesCliente = clienteSelecionado ? municipioId === clienteSelecionado : true;
    return matchesSituacao && matchesCliente;
  });
  const gruposMap = new Map<
    string,
    {
      key: string;
      municipioId: string | null;
      nome: string;
      items: typeof lista;
    }
  >();

  for (const item of lista) {
    const key = item.municipioId ?? "__sem_cliente";
    const grupo = gruposMap.get(key);
    if (grupo) {
      grupo.items.push(item);
    } else {
      gruposMap.set(key, {
        key,
        municipioId: item.municipioId,
        nome: item.mun?.clienteNome ?? "Sem cliente vinculado",
        items: [item],
      });
    }
  }

  const grupos = [...gruposMap.values()].sort((a, b) => {
    if (!a.municipioId) return 1;
    if (!b.municipioId) return -1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
  const hrefFiltro = (value: string) => {
    const params = new URLSearchParams({ s: value });
    if (clienteSelecionado) params.set("cliente", clienteSelecionado);
    return `/pendencias?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Abertas" value={abertas.length} tone={abertas.length ? "warning" : "muted"} />
        <Stat label="Resolvidas" value={resolvidas.length} tone="success" />
        <Stat label="Clientes com pendencias" value={clientesComPendenciasAbertas.size} tone="primary" />
      </div>

      <Panel>
        <PanelHeader
          title="Pendências"
          description="Geradas pelas regras e resolvidas automaticamente quando a condição é corrigida no sistema"
        />
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-app-border px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTROS.map((f) => (
              <Link
                key={f.value}
                href={hrefFiltro(f.value)}
                className={cn(
                  "rounded-app-pill px-3 py-1.5 text-xs font-semibold transition-colors",
                  filtro === f.value ? "bg-app-primary/15 text-app-primary" : "text-app-muted-foreground hover:bg-app-surface-elevated",
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <PendenciasClienteFilter
            clientes={clientesOrdenados}
            filtro={filtro}
            clienteSelecionado={clienteSelecionado}
          />
        </div>
        <div className="flex flex-col gap-4 p-3 sm:p-5">
          {grupos.length === 0 ? (
            <Empty title="Nada por aqui" description="Nenhuma pendência neste filtro." />
          ) : (
            grupos.map((grupo) => (
              <section key={grupo.key} className="rounded-app-md border border-app-border bg-app-surface-elevated/30">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-3 py-2.5">
                  {grupo.municipioId ? (
                    <Link href={`/clientes/${grupo.municipioId}`} className="text-sm font-bold text-app-foreground hover:text-app-primary hover:underline">
                      {grupo.nome}
                    </Link>
                  ) : (
                    <h3 className="text-sm font-bold text-app-foreground">{grupo.nome}</h3>
                  )}
                  <Badge tone="primary">{grupo.items.length}</Badge>
                </div>
                <div className="flex flex-col gap-2 p-2.5">
                  {grupo.items.map(({ p, mun, base, mod, con }) => (
                    <div key={p.id} className="rounded-app-md border border-app-border bg-app-surface px-3 py-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={PENDENCIA_TIPOS[p.tipo]?.tone ?? "muted"}>{PENDENCIA_TIPOS[p.tipo]?.label ?? p.tipo}</Badge>
                          {p.situacao === "resolvida" ? <Badge tone="success">resolvida</Badge> : null}
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-app-foreground">{p.descricao}</p>
                      <p className="mt-1 text-[11px] text-app-muted-foreground">
                        {mun ? (
                          <Link href={`/clientes/${mun.id}`} className="text-app-primary hover:underline">{mun.clienteNome}</Link>
                        ) : null}
                        {base ? ` · Base ${base.nome}` : ""}
                        {mod ? ` · Módulo ${mod.nome}` : ""}
                        {con ? ` · Contrato ${con.numero}` : ""}
                        {` · Criada em ${formatDateTime(p.createdAt)}`}
                        {p.resolvedAt ? ` · Resolvida em ${formatDateTime(p.resolvedAt)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
