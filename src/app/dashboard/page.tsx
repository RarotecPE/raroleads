import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  FileText,
  Layers,
  LayoutGrid,
  Puzzle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { checkDatabaseHealth, type DatabaseHealth } from "@/db/health";
import {
  baseModules,
  bases,
  contratoModulos,
  contratos,
  municipios,
  pendencias,
} from "@/db/schema";
import { Badge, Empty, Panel, PanelHeader, Stat } from "@/components/ui";
import { PENDENCIA_TIPOS } from "@/lib/constants";
import {
  computeOportunidades,
  contratadoSet,
  syncPendencias,
  vigenciaAlertas,
} from "@/lib/domain";
import { formatDate, formatDateTime, groupBy } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BUCKET_TONE = { 30: "danger", 60: "danger", 90: "warning", 120: "warning", 180: "primary" } as const;

function dashboardDatabaseError(health: Exclude<DatabaseHealth, { ok: true }>, syncError?: unknown) {
  const title = health.status === "connection_error" ? "Banco de dados inacessivel" : "Schema do banco incompleto";
  const description =
    health.status === "connection_error"
      ? "Nao foi possivel abrir a conexao configurada em DATABASE_CONNECTION/DATABASE_URL."
      : "O dashboard precisa das tabelas e colunas da migracao atual antes de carregar.";

  return (
    <Panel className="border-app-danger/40">
      <PanelHeader
        title={title}
        description={description}
        right={<Badge tone="danger">Erro de banco</Badge>}
      />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-app-foreground">O login foi concluido, mas o dashboard nao conseguiu ler os dados.</p>
            <p className="text-xs text-app-muted-foreground">
              Rode <code className="font-mono">npm run db:doctor</code> no mesmo ambiente do app para confirmar a conexao e o schema.
            </p>
          </div>
        </div>

        {health.status === "schema_mismatch" ? (
          <div className="grid gap-3 text-xs text-app-muted-foreground sm:grid-cols-2">
            <div>
              <p className="font-semibold text-app-foreground">Contexto</p>
              <p>Database: {health.context.database}</p>
              <p>Schema: {health.context.schema}</p>
            </div>
            <div>
              <p className="font-semibold text-app-foreground">Pendencias</p>
              <p>Tabelas: {health.missingTables.length ? health.missingTables.join(", ") : "ok"}</p>
              <p>Colunas base_modules: {health.missingBaseModuleColumns.length ? health.missingBaseModuleColumns.join(", ") : "ok"}</p>
              <p>Colunas clientes: {health.missingClienteColumns.length ? health.missingClienteColumns.join(", ") : "ok"}</p>
              <p>Colunas modulo_responsaveis: {health.missingModuloResponsavelColumns.length ? health.missingModuloResponsavelColumns.join(", ") : "ok"}</p>
              <p>Colunas documentos: {health.missingDocumentoColumns.length ? health.missingDocumentoColumns.join(", ") : "ok"}</p>
              <p>Colunas aditivos: {health.missingAditivoColumns.length ? health.missingAditivoColumns.join(", ") : "ok"}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-app-muted-foreground">
            <p className="font-semibold text-app-foreground">Erro de conexao</p>
            <p>
              {health.error.code}: {health.error.message}
            </p>
          </div>
        )}

        {syncError ? (
          <div className="text-xs text-app-muted-foreground">
            <p className="font-semibold text-app-foreground">Erro original</p>
            <p>{syncError instanceof Error ? syncError.message : String(syncError)}</p>
          </div>
        ) : null}

        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-3 text-xs text-app-muted-foreground">
          <p className="font-semibold text-app-foreground">Proximo passo</p>
          <p>
            Se o doctor indicar schema ausente, aplique <code className="font-mono">npm run db:schema</code>. Use{" "}
            <code className="font-mono">npm run db:seed</code> somente quando quiser carregar os dados iniciais.
          </p>
        </div>
      </div>
    </Panel>
  );
}

export default async function DashboardPage() {
  const health = await checkDatabaseHealth();
  if (!health.ok) return dashboardDatabaseError(health);

  try {
    await syncPendencias();
  } catch (error) {
    const currentHealth = await checkDatabaseHealth();
    if (!currentHealth.ok) return dashboardDatabaseError(currentHealth, error);
    return dashboardDatabaseError(
      {
        ok: false,
        status: "connection_error",
        error: {
          code: "QUERY_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      },
      error,
    );
  }

  const [ms, bs, mods, cs, cms, pends] = await Promise.all([
    db.select().from(municipios),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select().from(contratos),
    db.select().from(contratoModulos),
    db.select().from(pendencias),
  ]);

  const vigentes = cs.filter((c) => c.situacao === "vigente");
  const alertas = vigenciaAlertas(cs, ms);
  const vencendo60 = alertas.filter((a) => a.daysLeft <= 60).length;
  const conSet = contratadoSet(cms, cs);
  const habSemContrato = mods.filter((m) => m.habilitadoAt && !m.desabilitadoAt && !conSet.has(m.id)).length;
  const naoHabilitados = mods.filter((m) => conSet.has(m.id) && !m.habilitadoAt && !m.desabilitadoAt).length;
  const semAssinatura = cs.filter((c) =>
    ["recebido_sem_assinatura", "aguardando_assinatura"].includes(c.situacao),
  ).length;
  const abertas = pends.filter((p) => p.situacao === "aberta");
  const oportunidades = computeOportunidades(ms, bs, mods);
  const munById = new Map(ms.map((m) => [m.id, m]));
  const pendsPorTipo = groupBy(abertas, (p) => p.tipo);

  return (
    <div className="flex flex-col gap-5">
      {/* Métricas gerais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <Stat label="Clientes" value={ms.length} icon={<Building2 className="h-4 w-4" />} tone="primary" />
        <Stat label="Bases" value={bs.length} icon={<Layers className="h-4 w-4" />} tone="primary" />
        <Stat label="Módulos" value={mods.length} icon={<Puzzle className="h-4 w-4" />} tone="primary" />
        <Stat label="Contratos vigentes" value={vigentes.length} icon={<FileText className="h-4 w-4" />} tone="success" />
        <Stat label="Vencendo em 60d" value={vencendo60} icon={<CalendarClock className="h-4 w-4" />} tone="warning" hint={vencendo60 ? "Revisar renovações" : undefined} />
        <Stat label="Habilitados sem contrato" value={habSemContrato} icon={<Ban className="h-4 w-4" />} tone="danger" />
        <Stat label="Contratados não habilitados" value={naoHabilitados} icon={<LayoutGrid className="h-4 w-4" />} tone="warning" />
        <Stat label="Pendências abertas" value={abertas.length} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Alertas de vigência */}
        <Panel>
          <PanelHeader
            title="Alertas de vigência"
            description="Contratos vigentes vencendo em até 180 dias"
            right={<Link href="/contratos" className="text-xs font-semibold text-app-primary hover:underline">Ver contratos</Link>}
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {alertas.length === 0 ? (
              <Empty title="Nenhum contrato vencendo" description="Os próximos 180 dias estão livres." />
            ) : (
              alertas.slice(0, 8).map((a) => (
                <div key={a.contrato.id} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-foreground">
                      Contrato {a.contrato.numero}
                      {a.municipio ? <span className="font-normal text-app-muted-foreground"> · {a.municipio.clienteNome}</span> : null}
                    </p>
                    <p className="text-xs text-app-muted-foreground">Vence em {formatDate(a.contrato.dataFim)}</p>
                  </div>
                  <Badge tone={BUCKET_TONE[a.bucket]}>{a.daysLeft}d</Badge>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Pendências */}
        <Panel>
          <PanelHeader
            title="Pendências em aberto"
            right={<Link href="/pendencias" className="text-xs font-semibold text-app-primary hover:underline">Gerenciar</Link>}
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {abertas.length === 0 ? (
              <Empty title="Tudo em dia" description="Nenhuma pendência automática ativa no momento." />
            ) : (
              [...pendsPorTipo.entries()].slice(0, 6).map(([tipo, list]) => (
                <div key={tipo} className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <Badge tone={PENDENCIA_TIPOS[tipo]?.tone ?? "muted"}>{PENDENCIA_TIPOS[tipo]?.label ?? tipo}</Badge>
                    <p className="mt-1 truncate text-xs text-app-muted-foreground">{list[0].descricao}</p>
                  </div>
                  <span className="text-sm font-bold text-app-foreground tabular-nums">{list.length}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Oportunidades comerciais */}
        <Panel>
          <PanelHeader
            title="Oportunidades comerciais"
            description="Modulos do catalogo que o cliente ainda nao possui"
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {oportunidades.length === 0 ? (
              <Empty title="Sem oportunidades identificadas" description="Cadastre módulos nas bases dos clientes." />
            ) : (
              oportunidades.slice(0, 5).map((o) => (
                <Link
                  key={o.municipio.id}
                  href={`/clientes/${o.municipio.id}`}
                  className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5 transition-colors hover:border-app-muted-foreground/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-foreground">
                      <Sparkles className="mr-1 inline h-3.5 w-3.5 text-app-primary" />
                      {o.municipio.clienteNome}
                    </p>
                    <p className="truncate text-xs text-app-muted-foreground">{o.missing.join(" · ")}</p>
                  </div>
                  <Badge tone="primary">{o.missing.length} módulos</Badge>
                </Link>
              ))
            )}
          </div>
        </Panel>

        {/* Contratos sem assinatura */}
        <Panel>
          <PanelHeader
            title="Contratos sem assinatura"
            description="Recebidos ou aguardando formalização"
            right={<Link href="/contratos" className="text-xs font-semibold text-app-primary hover:underline">Ver todos</Link>}
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            {semAssinatura === 0 ? (
              <Empty title="Nenhum contrato sem assinatura" />
            ) : (
              cs
                .filter((c) => ["recebido_sem_assinatura", "aguardando_assinatura"].includes(c.situacao))
                .slice(0, 8)
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/contratos/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5 transition-colors hover:border-app-muted-foreground/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-foreground">
                        Contrato {c.numero}
                        <span className="font-normal text-app-muted-foreground"> · {munById.get(c.municipioId)?.clienteNome}</span>
                      </p>
                      <p className="text-xs text-app-muted-foreground">Criado em {formatDateTime(c.createdAt)}</p>
                    </div>
                    <Badge tone="warning">{c.situacao === "recebido_sem_assinatura" ? "Sem assinatura" : "Aguardando"}</Badge>
                  </Link>
                ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
