import PDFDocument from "pdfkit";
import { db } from "@/db";
import {
  aditivos,
  baseModules,
  bases,
  contratoModulos,
  contratos,
  documentos,
  eventos,
  municipios,
  moduloResponsaveis,
  pendencias,
  propostas,
} from "@/db/schema";
import { APP, EVENTO_TIPOS, MODULE_CATALOG, MUNICIPIO_SITUACOES, PENDENCIA_TIPOS, optLabel } from "@/lib/constants";
import { computeOportunidades, contratadoSet, contratoView, moduloState, syncPendencias } from "@/lib/domain";
import { countBy, formatDate, formatDateTime, norm } from "@/lib/utils";

export const REPORTS = [
  { tipo: "resumo-executivo", title: "Resumo executivo", description: "Totais gerais de clientes, contratos, modulos e pendencias." },
  { tipo: "ficha-clientes", title: "Ficha completa dos clientes", description: "Cadastro, bases, modulos, contratos, responsaveis e pendencias." },
  { tipo: "mapa-implantacao", title: "Mapa de implantacao", description: "Status operacional dos modulos por cliente e base." },
  { tipo: "contratos-vencimento", title: "Contratos a vencer e vencidos", description: "Contratos vigentes, vencendo e vencidos." },
  { tipo: "pendencias-clientes", title: "Pendencias por cliente", description: "Pendencias abertas e resolvidas agrupadas por cliente." },
  { tipo: "modulos-sem-contrato", title: "Modulos habilitados sem contrato", description: "Riscos administrativos por falta de formalizacao." },
  { tipo: "modulos-nao-habilitados", title: "Modulos contratados nao habilitados", description: "Itens contratados pendentes de habilitacao." },
  { tipo: "responsaveis-modulos", title: "Responsaveis por modulo", description: "Contatos vinculados a cliente, base e modulo." },
  { tipo: "bases-incompletas", title: "Bases incompletas", description: "Bases sem CNPJ ou com dados criticos ausentes." },
  { tipo: "historico-clientes", title: "Historico dos clientes", description: "Linha do tempo de eventos dos clientes." },
  { tipo: "oportunidades-comerciais", title: "Oportunidades comerciais", description: "Modulos do catalogo ainda nao cadastrados por cliente." },
  { tipo: "documentos-clientes", title: "Documentos por cliente", description: "Documentos vinculados a clientes, contratos, propostas e aditivos." },
] as const;

export type ReportTipo = (typeof REPORTS)[number]["tipo"];

type ReportData = Awaited<ReturnType<typeof getReportData>>;
type ReportSection = {
  title: string;
  rows: string[][];
  headers?: string[];
  empty?: string;
};

export function getReportDefinition(tipo: string) {
  return REPORTS.find((report) => report.tipo === tipo);
}

export function reportFileName(tipo: ReportTipo) {
  return `${tipo}.pdf`;
}

async function getReportData() {
  await syncPendencias();
  const [ms, bs, mods, cs, cms, pends, responsaveis, docs, props, adts, evts] = await Promise.all([
    db.select().from(municipios),
    db.select().from(bases),
    db.select().from(baseModules),
    db.select().from(contratos),
    db.select().from(contratoModulos),
    db.select().from(pendencias),
    db.select().from(moduloResponsaveis),
    db.select().from(documentos),
    db.select().from(propostas),
    db.select().from(aditivos),
    db.select().from(eventos),
  ]);

  const baseById = new Map(bs.map((b) => [b.id, b]));
  const munById = new Map(ms.map((m) => [m.id, m]));
  const modById = new Map(mods.map((m) => [m.id, m]));
  const contratoById = new Map(cs.map((c) => [c.id, c]));
  const propostaById = new Map(props.map((p) => [p.id, p]));
  const aditivoById = new Map(adts.map((a) => [a.id, a]));
  const conSet = contratadoSet(cms, cs);
  const oportunidades = computeOportunidades(ms, bs, mods);

  return {
    ms,
    bs,
    mods,
    cs,
    cms,
    pends,
    responsaveis,
    docs,
    props,
    adts,
    evts,
    baseById,
    munById,
    modById,
    contratoById,
    propostaById,
    aditivoById,
    conSet,
    oportunidades,
  };
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return formatDateTime(value);
  return String(value);
}

function moduleContext(data: ReportData, baseModuleId?: string | null) {
  const modulo = baseModuleId ? data.modById.get(baseModuleId) : undefined;
  const base = modulo ? data.baseById.get(modulo.baseId) : undefined;
  const cliente = base ? data.munById.get(base.municipioId) : undefined;
  return { modulo, base, cliente };
}

function eventContext(data: ReportData, evento: ReportData["evts"][number]) {
  const modulo = evento.baseModuleId ? data.modById.get(evento.baseModuleId) : undefined;
  const base = evento.baseId ? data.baseById.get(evento.baseId) : modulo ? data.baseById.get(modulo.baseId) : undefined;
  const cliente = evento.municipioId ? data.munById.get(evento.municipioId) : base ? data.munById.get(base.municipioId) : undefined;
  const contrato = evento.contratoId ? data.contratoById.get(evento.contratoId) : undefined;
  return { modulo, base, cliente, contrato };
}

function buildSections(tipo: ReportTipo, data: ReportData): ReportSection[] {
  const contratoViews = data.cs.map((contrato) => ({ contrato, view: contratoView(contrato) }));

  if (tipo === "resumo-executivo") {
    const porSituacao = countBy(data.ms, (cliente) => cliente.situacao);
    const abertas = data.pends.filter((pendencia) => pendencia.situacao === "aberta");
    const habilitados = data.mods.filter((modulo) => modulo.habilitadoAt && !modulo.desabilitadoAt);
    return [
      {
        title: "Indicadores gerais",
        headers: ["Indicador", "Total"],
        rows: [
          ["Clientes", data.ms.length],
          ["Bases", data.bs.length],
          ["Modulos", data.mods.length],
          ["Contratos", data.cs.length],
          ["Contratos vigentes", data.cs.filter((c) => c.situacao === "vigente").length],
          ["Contratos vencendo", contratoViews.filter((item) => item.view.value === "proximo_vencimento").length],
          ["Contratos vencidos", contratoViews.filter((item) => item.view.value === "vencido").length],
          ["Modulos habilitados", habilitados.length],
          ["Modulos habilitados sem execucao", habilitados.filter((m) => !m.execucaoInicio).length],
          ["Pendencias abertas", abertas.length],
          ["Bases incompletas", data.bs.filter((base) => !base.cnpj).length],
        ].map((row) => row.map(text)),
      },
      {
        title: "Clientes por situacao",
        headers: ["Situacao", "Total"],
        rows: MUNICIPIO_SITUACOES.map((situacao) => [situacao.label, text(porSituacao.get(situacao.value) ?? 0)]),
      },
    ];
  }

  if (tipo === "ficha-clientes") {
    return data.ms
      .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"))
      .map((cliente) => {
        const clienteBases = data.bs.filter((base) => base.municipioId === cliente.id);
        const baseIds = new Set(clienteBases.map((base) => base.id));
        const clienteMods = data.mods.filter((modulo) => baseIds.has(modulo.baseId));
        const clienteContratos = data.cs.filter((contrato) => contrato.municipioId === cliente.id);
        const clientePendencias = data.pends.filter((pendencia) => pendencia.municipioId === cliente.id && pendencia.situacao === "aberta");
        return {
          title: cliente.clienteNome,
          headers: ["Campo", "Valor"],
          rows: [
            ["Municipio/UF", `${cliente.municipio} - ${cliente.uf}`],
            ["Situacao", optLabel(cliente.situacao)],
            ["Codigo IBGE", cliente.codigoIbge],
            ["Populacao", cliente.populacao],
            ["Bases", clienteBases.length],
            ["Modulos", clienteMods.length],
            ["Contratos", clienteContratos.length],
            ["Pendencias abertas", clientePendencias.length],
            ["Dados administrativos", cliente.dadosAdministrativos],
            ["Observacoes", cliente.observacoes],
          ].map((row) => row.map(text)),
        };
      });
  }

  if (tipo === "mapa-implantacao") {
    return [{
      title: "Modulos por cliente e base",
      headers: ["Cliente", "Base", "Modulo", "Status", "Habilitado", "Execucao"],
      empty: "Nenhum modulo cadastrado.",
      rows: data.mods.map((modulo) => {
        const base = data.baseById.get(modulo.baseId);
        const cliente = base ? data.munById.get(base.municipioId) : undefined;
        const state = moduloState(modulo, data.conSet.has(modulo.id));
        return [
          cliente?.clienteNome,
          base?.nome,
          modulo.nome,
          state.label,
          formatDate(modulo.habilitadoAt),
          formatDate(modulo.execucaoInicio),
        ].map(text);
      }),
    }];
  }

  if (tipo === "contratos-vencimento") {
    return [{
      title: "Contratos",
      headers: ["Contrato", "Cliente", "Situacao", "Vigencia final", "Dias"],
      empty: "Nenhum contrato cadastrado.",
      rows: contratoViews
        .sort((a, b) => (a.view.daysLeft ?? 99999) - (b.view.daysLeft ?? 99999))
        .map(({ contrato, view }) => [
          contrato.numero,
          data.munById.get(contrato.municipioId)?.clienteNome,
          view.label,
          formatDate(contrato.dataFim),
          view.daysLeft ?? "-",
        ].map(text)),
    }];
  }

  if (tipo === "pendencias-clientes") {
    return [{
      title: "Pendencias",
      headers: ["Cliente", "Tipo", "Situacao", "Contexto", "Criada", "Resolvida"],
      empty: "Nenhuma pendencia cadastrada.",
      rows: data.pends.map((pendencia) => {
        const ctx = moduleContext(data, pendencia.baseModuleId);
        const base = pendencia.baseId ? data.baseById.get(pendencia.baseId) : ctx.base;
        const cliente = pendencia.municipioId ? data.munById.get(pendencia.municipioId) : ctx.cliente;
        const contrato = pendencia.contratoId ? data.contratoById.get(pendencia.contratoId) : undefined;
        return [
          cliente?.clienteNome,
          PENDENCIA_TIPOS[pendencia.tipo]?.label ?? pendencia.tipo,
          pendencia.situacao,
          [base?.nome, ctx.modulo?.nome, contrato ? `Contrato ${contrato.numero}` : null].filter(Boolean).join(" / "),
          formatDateTime(pendencia.createdAt),
          pendencia.resolvedAt ? formatDateTime(pendencia.resolvedAt) : "-",
        ].map(text);
      }),
    }];
  }

  if (tipo === "modulos-sem-contrato") {
    const rows = data.mods
      .filter((modulo) => modulo.habilitadoAt && !modulo.desabilitadoAt && !data.conSet.has(modulo.id))
      .map((modulo) => {
        const { base, cliente } = moduleContext(data, modulo.id);
        return [cliente?.clienteNome, base?.nome, modulo.nome, formatDate(modulo.habilitadoAt)].map(text);
      });
    return [{ title: "Modulos habilitados sem contrato", headers: ["Cliente", "Base", "Modulo", "Habilitado em"], empty: "Nenhum modulo habilitado sem contrato.", rows }];
  }

  if (tipo === "modulos-nao-habilitados") {
    const rows = data.mods
      .filter((modulo) => data.conSet.has(modulo.id) && !modulo.habilitadoAt && !modulo.desabilitadoAt)
      .map((modulo) => {
        const { base, cliente } = moduleContext(data, modulo.id);
        return [cliente?.clienteNome, base?.nome, modulo.nome, "Contratado"].map(text);
      });
    return [{ title: "Modulos contratados nao habilitados", headers: ["Cliente", "Base", "Modulo", "Status"], empty: "Nenhum modulo contratado pendente de habilitacao.", rows }];
  }

  if (tipo === "responsaveis-modulos") {
    return [{
      title: "Responsaveis",
      headers: ["Cliente", "Base", "Modulo", "Responsavel", "Email", "Celular", "Aviso email"],
      empty: "Nenhum responsavel cadastrado.",
      rows: data.responsaveis.map((responsavel) => {
        const { modulo, base, cliente } = moduleContext(data, responsavel.baseModuleId);
        return [
          cliente?.clienteNome,
          base?.nome,
          modulo?.nome,
          responsavel.nome,
          responsavel.email,
          responsavel.celular,
          responsavel.avisoHabilitacaoEmail ? "Sim" : "Nao",
        ].map(text);
      }),
    }];
  }

  if (tipo === "bases-incompletas") {
    const rows = data.bs
      .filter((base) => !base.cnpj)
      .map((base) => [data.munById.get(base.municipioId)?.clienteNome, base.nome, base.tipo, "CNPJ ausente"].map(text));
    return [{ title: "Bases incompletas", headers: ["Cliente", "Base", "Tipo", "Pendencia"], empty: "Nenhuma base incompleta encontrada.", rows }];
  }

  if (tipo === "historico-clientes") {
    return [{
      title: "Eventos",
      headers: ["Data", "Cliente", "Evento", "Contexto", "Usuario", "Descricao"],
      empty: "Nenhum evento registrado.",
      rows: data.evts
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .map((evento) => {
          const ctx = eventContext(data, evento);
          return [
            formatDate(evento.data),
            ctx.cliente?.clienteNome,
            EVENTO_TIPOS[evento.tipo] ?? evento.tipo,
            [ctx.base?.nome, ctx.modulo?.nome, ctx.contrato ? `Contrato ${ctx.contrato.numero}` : null].filter(Boolean).join(" / "),
            evento.usuario,
            evento.descricao,
          ].map(text);
        }),
    }];
  }

  if (tipo === "oportunidades-comerciais") {
    return [{
      title: "Oportunidades",
      headers: ["Cliente", "Municipio/UF", "Modulos sugeridos"],
      empty: "Nenhuma oportunidade identificada.",
      rows: data.oportunidades.map((oportunidade) => [
        oportunidade.municipio.clienteNome,
        `${oportunidade.municipio.municipio} - ${oportunidade.municipio.uf}`,
        oportunidade.missing.join(", "),
      ]),
    }];
  }

  if (tipo === "documentos-clientes") {
    return [{
      title: "Documentos",
      headers: ["Cliente", "Tipo", "Nome", "Contexto", "Criado em"],
      empty: "Nenhum documento cadastrado.",
      rows: data.docs.map((documento) => {
        const ctx = moduleContext(data, documento.baseModuleId);
        const cliente = documento.municipioId ? data.munById.get(documento.municipioId) : ctx.cliente;
        const contrato = documento.contratoId ? data.contratoById.get(documento.contratoId) : undefined;
        const proposta = documento.propostaId ? data.propostaById.get(documento.propostaId) : undefined;
        const aditivo = documento.aditivoId ? data.aditivoById.get(documento.aditivoId) : undefined;
        return [
          cliente?.clienteNome,
          optLabel(documento.tipo),
          documento.nome,
          [
            ctx.base?.nome,
            ctx.modulo?.nome,
            contrato ? `Contrato ${contrato.numero}` : null,
            proposta ? `Proposta ${optLabel(proposta.tipo)}` : null,
            aditivo ? `Aditivo ${optLabel(aditivo.tipo)}` : null,
          ].filter(Boolean).join(" / "),
          formatDateTime(documento.createdAt),
        ].map(text);
      }),
    }];
  }

  return [];
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text(APP.name);
  doc.moveDown(0.2);
  doc.fillColor("#1f2937").fontSize(14).text(title);
  doc.moveDown(0.2);
  doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(`Emitido em ${formatDateTime(new Date())}`);
  doc.moveDown(1);
}

function drawSection(doc: PDFKit.PDFDocument, section: ReportSection) {
  ensureSpace(doc, 70);
  doc.fillColor("#111827").fontSize(12).font("Helvetica-Bold").text(section.title);
  doc.moveDown(0.4);

  if (section.rows.length === 0) {
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(section.empty ?? "Nenhum registro encontrado.");
    doc.moveDown(1);
    return;
  }

  const headers = section.headers;
  const rows = headers ? [headers, ...section.rows] : section.rows;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = Math.max(...rows.map((row) => row.length));
  const colWidth = tableWidth / columns;

  rows.forEach((row, index) => {
    const isHeader = Boolean(headers && index === 0);
    const cells = Array.from({ length: columns }, (_, cellIndex) => text(row[cellIndex]));
    const heights = cells.map((cell) => doc.heightOfString(cell, { width: colWidth - 8 }));
    const rowHeight = Math.max(22, ...heights) + 8;
    ensureSpace(doc, rowHeight);

    const startY = doc.y;
    doc.rect(doc.page.margins.left, startY, tableWidth, rowHeight).fill(isHeader ? "#e5e7eb" : index % 2 === 0 ? "#f8fafc" : "#ffffff");
    cells.forEach((cell, cellIndex) => {
      doc
        .fillColor(isHeader ? "#111827" : "#374151")
        .fontSize(isHeader ? 8 : 7.5)
        .font(isHeader ? "Helvetica-Bold" : "Helvetica")
        .text(cell, doc.page.margins.left + cellIndex * colWidth + 4, startY + 5, {
          width: colWidth - 8,
          lineGap: 1,
        });
    });
    doc.y = startY + rowHeight;
  });
  doc.moveDown(1);
}

function pdfToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generateReportPdf(tipo: ReportTipo) {
  const definition = REPORTS.find((report) => report.tipo === tipo);
  if (!definition) throw new Error("Relatorio nao encontrado.");

  const data = await getReportData();
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
  drawHeader(doc, definition.title);
  doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(definition.description);
  doc.moveDown(1);

  const sections = buildSections(tipo, data);
  if (sections.length === 0) {
    drawSection(doc, { title: definition.title, rows: [], empty: "Nenhum dado disponivel para este relatorio." });
  } else {
    sections.forEach((section) => drawSection(doc, section));
  }

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    doc.fillColor("#94a3b8").fontSize(8).text(`Pagina ${i + 1} de ${pages.count}`, 36, doc.page.height - 28, {
      align: "right",
      width: doc.page.width - 72,
    });
  }

  return pdfToBuffer(doc);
}

export function reportLinks() {
  return REPORTS.map((report) => ({
    ...report,
    href: `/api/relatorios/${report.tipo}/pdf`,
  }));
}
