import { CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { baseModules, bases, contratos, municipios, pendencias } from "@/db/schema";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Badge, Empty, Field, Panel, PanelHeader, Stat, btnPrimary, btnXsGhost, selectCls, textareaCls } from "@/components/ui";
import { createPendencia, resolverPendencia } from "@/lib/actions";
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
  searchParams: Promise<{ s?: string }>;
}) {
  await syncPendencias();
  const { s } = await searchParams;
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

  const abertas = pends.filter((p) => p.situacao === "aberta");
  const resolvidas = pends.filter((p) => p.situacao === "resolvida");
  const lista = pends.filter((p) =>
    filtro === "todas" ? true : filtro === "resolvidas" ? p.situacao === "resolvida" : p.situacao === "aberta",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Abertas" value={abertas.length} tone={abertas.length ? "warning" : "muted"} />
        <Stat label="Resolvidas" value={resolvidas.length} tone="success" />
        <Stat label="Municípios com pendências" value={new Set(abertas.map((p) => p.municipioId).filter(Boolean)).size} tone="primary" />
      </div>

      <Panel>
        <PanelHeader
          title="Pendências"
          description="Automáticas são geradas pelas regras; manuais podem ser criadas aqui"
          right={
            <Dialog
              title="Nova pendência manual"
              trigger={
                <button type="button" className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Nova pendência
                </button>
              }
            >
              <DialogForm action={createPendencia}>
                <Field label="Município">
                  <select name="municipioId" className={selectCls} defaultValue="">
                    <option value="">— Sem vínculo —</option>
                    {ms.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Descrição">
                  <textarea name="descricao" required rows={3} className={textareaCls} placeholder="Descreva a pendência…" />
                </Field>
                <div className="flex justify-end">
                  <SubmitButton className={btnPrimary}>Criar pendência</SubmitButton>
                </div>
              </DialogForm>
            </Dialog>
          }
        />
        <div className="flex flex-wrap items-center gap-1.5 border-b border-app-border px-4 py-3 sm:px-5">
          {FILTROS.map((f) => (
            <Link
              key={f.value}
              href={`/pendencias?s=${f.value}`}
              className={cn(
                "rounded-app-pill px-3 py-1.5 text-xs font-semibold transition-colors",
                filtro === f.value ? "bg-app-primary/15 text-app-primary" : "text-app-muted-foreground hover:bg-app-surface-elevated",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2 p-3 sm:p-5">
          {lista.length === 0 ? (
            <Empty title="Nada por aqui" description="Nenhuma pendência neste filtro." />
          ) : (
            lista.map((p) => {
              const mun = p.municipioId ? munById.get(p.municipioId) : undefined;
              const mod = p.baseModuleId ? modById.get(p.baseModuleId) : undefined;
              const base = p.baseId ? baseById.get(p.baseId) : mod ? baseById.get(mod.baseId) : undefined;
              const con = p.contratoId ? conById.get(p.contratoId) : undefined;
              return (
                <div key={p.id} className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={PENDENCIA_TIPOS[p.tipo]?.tone ?? "muted"}>{PENDENCIA_TIPOS[p.tipo]?.label ?? p.tipo}</Badge>
                      {p.origem === "manual" ? <Badge tone="primary">manual</Badge> : null}
                      {p.situacao === "resolvida" ? <Badge tone="success">resolvida</Badge> : null}
                    </div>
                    {p.situacao === "aberta" ? (
                      <form action={resolverPendencia}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className={btnXsGhost} title="Resolver pendência" aria-label="Resolver pendência">
                          <CheckCircle2 className="h-3.5 w-3.5 text-app-success" /> Resolver
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm text-app-foreground">{p.descricao}</p>
                  <p className="mt-1 text-[11px] text-app-muted-foreground">
                    {mun ? (
                      <Link href={`/municipios/${mun.id}`} className="text-app-primary hover:underline">{mun.nome}</Link>
                    ) : null}
                    {base ? ` · Base ${base.nome}` : ""}
                    {mod ? ` · Módulo ${mod.nome}` : ""}
                    {con ? ` · Contrato ${con.numero}` : ""}
                    {` · Criada em ${formatDateTime(p.createdAt)}`}
                    {p.resolvedAt ? ` · Resolvida em ${formatDateTime(p.resolvedAt)}` : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
