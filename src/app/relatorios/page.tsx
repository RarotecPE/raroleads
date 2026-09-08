import Link from "next/link";
import { FileDown } from "lucide-react";
import { db } from "@/db";
import {
  baseModules,
  bases,
  contratoModulos,
  contratos,
  municipios,
  pendencias,
} from "@/db/schema";
import { Badge, Empty, Panel, PanelHeader } from "@/components/ui";
import { MUNICIPIO_SITUACOES, optLabel, optTone } from "@/lib/constants";
import { contratadoSet, contratoView, syncPendencias } from "@/lib/domain";
import { reportLinks } from "@/lib/reports/pdf";
import { countBy, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2 text-sm">
      {children}
    </div>
  );
}

function PdfButton({ tipo }: { tipo: string }) {
  return (
    <a
      href={`/api/relatorios/${tipo}/pdf`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground"
    >
      <FileDown className="h-3.5 w-3.5" /> Exportar PDF
    </a>
  );
}

export default async function RelatoriosPage() {
  await syncPendencias();
  const [ms, bs, mods, cs, cms, pends] = await Promise.all([
    db.select().from(municipios),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select().from(contratos),
    db.select().from(contratoModulos),
    db.select().from(pendencias),
  ]);

  const baseById = new Map(bs.map((b) => [b.id, b]));
  const conSet = contratadoSet(cms, cs);
  const views = cs.map((c) => ({ c, view: contratoView(c) }));
  const ativos = ms.filter((m) => m.situacao === "cliente_ativo");
  const porSituacao = countBy(ms, (m) => m.situacao);
  const semContrato = ms.filter(
    (m) => !cs.some((c) => c.municipioId === m.id && c.situacao === "vigente"),
  );
  const basesSemFormalizacao = bs.filter(
    (b) => !cs.some((c) => c.municipioId === b.municipioId && c.situacao === "vigente"),
  );
  const contratados = mods.filter((m) => conSet.has(m.id));
  const habilitados = mods.filter((m) => m.habilitadoAt && !m.desabilitadoAt);
  const semUtilizacao = habilitados.filter((m) => !m.execucaoInicio);
  const vigentes = views.filter((v) => v.c.situacao === "vigente" && v.view.value === "vigente");
  const vencendo = views.filter((v) => v.view.value === "proximo_vencimento");
  const vencidos = views.filter((v) => v.view.value === "vencido");
  const abertas = pends.filter((p) => p.situacao === "aberta");
  const pendsPorMun = countBy(abertas.filter((p) => p.municipioId), (p) => p.municipioId!);
  const munById = new Map(ms.map((m) => [m.id, m]));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel className="xl:col-span-2">
        <PanelHeader title="Relatorios impressos" description="PDFs consolidados para reunioes, acompanhamento e arquivo" />
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
          {reportLinks().map((report) => (
            <a
              key={report.tipo}
              href={report.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5 transition-colors hover:border-app-muted-foreground/40"
            >
              <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-app-foreground">{report.title}</span>
                <span className="mt-0.5 block text-xs text-app-muted-foreground">{report.description}</span>
              </span>
            </a>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Clientes por situacao" description={`${ativos.length} cliente(s) ativo(s) de ${ms.length}`} right={<PdfButton tipo="resumo-executivo" />} />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {MUNICIPIO_SITUACOES.map((s) => (
            <Row key={s.value}>
              <span className="text-app-foreground">{s.label}</span>
              <Badge tone={s.tone}>{porSituacao.get(s.value) ?? 0}</Badge>
            </Row>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Clientes sem contrato vigente" right={<PdfButton tipo="ficha-clientes" />} />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {semContrato.length === 0 ? (
            <Empty title="Todos possuem contrato vigente" />
          ) : (
            semContrato.map((m) => (
              <Row key={m.id}>
                <Link href={`/clientes/${m.id}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">
                  {m.clienteNome} <span className="text-xs font-normal text-app-muted-foreground">{m.municipio} - {m.uf}</span>
                </Link>
                <Badge tone={optTone(m.situacao)}>{optLabel(m.situacao)}</Badge>
              </Row>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Bases sem formalizacao" description="Bases de clientes sem contrato vigente" right={<PdfButton tipo="bases-incompletas" />} />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {basesSemFormalizacao.length === 0 ? (
            <Empty title="Todas as bases estão formalizadas" />
          ) : (
            basesSemFormalizacao.map((b) => (
              <Row key={b.id}>
                <span className="text-app-foreground">
                  {b.nome} <span className="text-xs text-app-muted-foreground">· {munById.get(b.municipioId)?.clienteNome}</span>
                </span>
                <Badge tone="warning">{b.tipo}</Badge>
              </Row>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Módulos" description="Contratados, habilitados e sem utilização" right={<PdfButton tipo="mapa-implantacao" />} />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          <Row>
            <span className="text-app-foreground">Contratados</span>
            <Badge tone="primary">{contratados.length}</Badge>
          </Row>
          <Row>
            <span className="text-app-foreground">Habilitados</span>
            <Badge tone="primary">{habilitados.length}</Badge>
          </Row>
          <Row>
            <span className="text-app-foreground">Habilitados sem utilização</span>
            <Badge tone="warning">{semUtilizacao.length}</Badge>
          </Row>
          {semUtilizacao.slice(0, 6).map((m) => (
            <Row key={m.id}>
              <span className="text-xs text-app-muted-foreground">
                {m.nome} · {baseById.get(m.baseId)?.nome} · {munById.get(baseById.get(m.baseId)?.municipioId ?? "")?.clienteNome}
              </span>
              <Badge tone="warning">sem execução</Badge>
            </Row>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Contratos" description="Vigentes, vencendo e vencidos" right={<PdfButton tipo="contratos-vencimento" />} />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          <Row>
            <span className="text-app-foreground">Vigentes</span>
            <Badge tone="success">{vigentes.length}</Badge>
          </Row>
          <Row>
            <span className="text-app-foreground">Vencendo (≤ 60d)</span>
            <Badge tone="warning">{vencendo.length}</Badge>
          </Row>
          <Row>
            <span className="text-app-foreground">Vencidos</span>
            <Badge tone="danger">{vencidos.length}</Badge>
          </Row>
          {[...vencendo, ...vencidos].slice(0, 6).map(({ c, view }) => (
            <Row key={c.id}>
              <Link href={`/contratos/${c.id}`} className="text-xs font-semibold text-app-foreground hover:text-app-primary hover:underline">
                Contrato {c.numero} · {munById.get(c.municipioId)?.clienteNome} · ate {formatDate(c.dataFim)}
              </Link>
              <Badge tone={view.tone}>{view.label}</Badge>
            </Row>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Pendencias por cliente" description={`${abertas.length} aberta(s) no total`} right={<PdfButton tipo="pendencias-clientes" />} />
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {pendsPorMun.size === 0 ? (
            <Empty title="Nenhuma pendência aberta" />
          ) : (
            [...pendsPorMun.entries()].map(([munId, total]) => (
              <Row key={munId}>
                <Link href={`/clientes/${munId}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">
                  {munById.get(munId)?.clienteNome ?? "-"}
                </Link>
                <Badge tone="warning">{total} aberta(s)</Badge>
              </Row>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
