"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  aditivos,
  baseModules,
  bases,
  contratoModulos,
  contratos,
  documentos,
  municipios,
  pendencias,
  propostas,
} from "@/db/schema";
import { requireServerActionPermission } from "@/lib/auth";
import { logEvent, syncPendencias } from "@/lib/domain";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const req = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) throw new Error(`Campo obrigatório ausente: ${k}`);
  return v;
};
const int = (fd: FormData, k: string) => {
  const v = str(fd, k);
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isNaN(n) ? null : n;
};
const done = () => revalidatePath("/", "layout");

/* ---------------- Municípios ---------------- */

export async function createMunicipio(fd: FormData) {
  await requireServerActionPermission();
  const nome = req(fd, "nome");
  const [row] = await db
    .insert(municipios)
    .values({
      nome,
      uf: req(fd, "uf").toUpperCase().slice(0, 2),
      codigoIbge: str(fd, "codigoIbge"),
      populacao: int(fd, "populacao"),
      situacao: str(fd, "situacao") ?? "prospect",
      dadosAdministrativos: str(fd, "dadosAdministrativos"),
      observacoes: str(fd, "observacoes"),
    })
    .returning();
  await logEvent({ tipo: "municipio_criado", descricao: `Município ${nome} criado.`, municipioId: row.id });
  await syncPendencias();
  done();
}

export async function updateMunicipio(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  await db
    .update(municipios)
    .set({
      nome: req(fd, "nome"),
      uf: req(fd, "uf").toUpperCase().slice(0, 2),
      codigoIbge: str(fd, "codigoIbge"),
      populacao: int(fd, "populacao"),
      situacao: str(fd, "situacao") ?? "prospect",
      dadosAdministrativos: str(fd, "dadosAdministrativos"),
      observacoes: str(fd, "observacoes"),
    })
    .where(eq(municipios.id, id));
  await logEvent({ tipo: "municipio_atualizado", descricao: "Dados do município atualizados.", municipioId: id });
  await syncPendencias();
  done();
}

/* ---------------- Bases ---------------- */

export async function createBase(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  const nome = req(fd, "nome");
  const [row] = await db
    .insert(bases)
    .values({
      municipioId,
      nome,
      tipo: str(fd, "tipo") ?? "outros",
      cnpj: str(fd, "cnpj"),
      observacoes: str(fd, "observacoes"),
    })
    .returning();
  await logEvent({ tipo: "base_criada", descricao: `Base ${nome} criada.`, municipioId, baseId: row.id });
  await syncPendencias();
  done();
}

/* ---------------- Módulos ---------------- */

export async function createModulo(fd: FormData) {
  await requireServerActionPermission();
  const baseId = req(fd, "baseId");
  const municipioId = str(fd, "municipioId");
  const nome = req(fd, "nome");
  const [row] = await db
    .insert(baseModules)
    .values({ baseId, nome, observacoes: str(fd, "observacoes") })
    .returning();
  await logEvent({ tipo: "modulo_criado", descricao: `Módulo ${nome} criado na base.`, municipioId, baseId, baseModuleId: row.id });
  await syncPendencias();
  done();
}

export async function habilitarModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const municipioId = str(fd, "municipioId");
  const solicitacaoAt = str(fd, "solicitacaoAt");
  const habilitadoAt = req(fd, "habilitadoAt");
  const solicitante = str(fd, "solicitante");
  const origem = str(fd, "origem");
  await db
    .update(baseModules)
    .set({
      habilitadoAt,
      solicitacaoAt,
      solicitante,
      solicitacaoOrigem: origem,
      implantacaoStatus: str(fd, "implantacaoStatus") ?? undefined,
    })
    .where(eq(baseModules.id, id));
  if (solicitacaoAt) {
    await logEvent({
      tipo: "habilitacao_solicitada",
      descricao: `Solicitada habilitação${solicitante ? ` por ${solicitante}` : ""}${origem ? ` (origem: ${origem})` : ""}.`,
      municipioId,
      baseModuleId: id,
      data: solicitacaoAt,
    });
  }
  await logEvent({ tipo: "habilitado", descricao: "Módulo habilitado.", municipioId, baseModuleId: id, data: habilitadoAt });
  await syncPendencias();
  done();
}

export async function migracaoModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const municipioId = str(fd, "municipioId");
  const inicio = str(fd, "migracaoInicio");
  const fim = str(fd, "migracaoFim");
  await db.update(baseModules).set({ migracaoInicio: inicio, migracaoFim: fim }).where(eq(baseModules.id, id));
  await logEvent({
    tipo: "migracao",
    descricao: fim ? `Migração concluída (${inicio ?? "?"} a ${fim}).` : `Migração iniciada em ${inicio ?? today()}.`,
    municipioId,
    baseModuleId: id,
    data: fim ?? inicio ?? today(),
  });
  await syncPendencias();
  done();
}

const today = () => new Date().toISOString().slice(0, 10);

export async function implantacaoModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const municipioId = str(fd, "municipioId");
  const status = req(fd, "implantacaoStatus");
  await db.update(baseModules).set({ implantacaoStatus: status }).where(eq(baseModules.id, id));
  await logEvent({ tipo: "implantacao", descricao: `Implantação: ${status}.`, municipioId, baseModuleId: id });
  await syncPendencias();
  done();
}

export async function execucaoModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const municipioId = str(fd, "municipioId");
  const data = str(fd, "execucaoInicio") ?? today();
  await db.update(baseModules).set({ execucaoInicio: data }).where(eq(baseModules.id, id));
  await logEvent({ tipo: "execucao_iniciada", descricao: "Cliente iniciou a utilização do módulo.", municipioId, baseModuleId: id, data });
  await syncPendencias();
  done();
}

export async function desabilitarModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const municipioId = str(fd, "municipioId");
  const data = str(fd, "data") ?? today();
  const motivo = req(fd, "motivo");
  const justificativa = req(fd, "justificativa");
  await db
    .update(baseModules)
    .set({ desabilitadoAt: data, desabilitadoMotivo: motivo, desabilitadoJustificativa: justificativa })
    .where(eq(baseModules.id, id));
  await logEvent({
    tipo: "desabilitado",
    descricao: `Módulo desabilitado — motivo: ${motivo}. ${justificativa}`,
    municipioId,
    baseModuleId: id,
    data,
  });
  await syncPendencias();
  done();
}

export async function reabilitarModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const municipioId = str(fd, "municipioId");
  await db
    .update(baseModules)
    .set({ desabilitadoAt: null, desabilitadoMotivo: null, desabilitadoJustificativa: null })
    .where(eq(baseModules.id, id));
  await logEvent({ tipo: "reabilitado", descricao: "Módulo reabilitado (histórico de desabilitação preservado).", municipioId, baseModuleId: id });
  await syncPendencias();
  done();
}

/* ---------------- Propostas ---------------- */

export async function createProposta(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  const [row] = await db
    .insert(propostas)
    .values({
      municipioId,
      tipo: str(fd, "tipo") ?? "formal",
      data: str(fd, "data") ?? today(),
      basesEnvolvidas: str(fd, "basesEnvolvidas"),
      modulosEnvolvidos: str(fd, "modulosEnvolvidos"),
      observacoes: str(fd, "observacoes"),
    })
    .returning();
  await logEvent({ tipo: "proposta_criada", descricao: `Proposta criada (${row.tipo}).`, municipioId, data: row.data ?? today() });
  await syncPendencias();
  done();
}

export async function setPropostaSituacao(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const situacao = req(fd, "situacao");
  await db.update(propostas).set({ situacao }).where(eq(propostas.id, id));
  const [p] = await db.select().from(propostas).where(eq(propostas.id, id));
  await logEvent({ tipo: "proposta_situacao", descricao: `Proposta marcada como ${situacao}.`, municipioId: p?.municipioId ?? null });
  await syncPendencias();
  done();
}

/* ---------------- Contratos ---------------- */

export async function createContrato(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  const [row] = await db
    .insert(contratos)
    .values({
      municipioId,
      numero: req(fd, "numero"),
      modalidade: str(fd, "modalidade") ?? "outros",
      processo: str(fd, "processo"),
      propostaId: str(fd, "propostaId"),
      dataAssinatura: str(fd, "dataAssinatura"),
      dataInicio: str(fd, "dataInicio"),
      dataFim: str(fd, "dataFim"),
      situacao: str(fd, "situacao") ?? "aguardando_assinatura",
      observacoes: str(fd, "observacoes"),
    })
    .returning();
  await logEvent({ tipo: "contrato_criado", descricao: `Contrato ${row.numero} criado.`, municipioId, contratoId: row.id });
  await syncPendencias();
  done();
}

export async function setContratoSituacao(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const situacao = req(fd, "situacao");
  await db.update(contratos).set({ situacao }).where(eq(contratos.id, id));
  const [c] = await db.select().from(contratos).where(eq(contratos.id, id));
  await logEvent({ tipo: "contrato_situacao", descricao: `Contrato ${c?.numero ?? id} marcado como ${situacao}.`, municipioId: c?.municipioId ?? null, contratoId: id });
  await syncPendencias();
  done();
}

export async function vincularModulo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const baseModuleId = req(fd, "baseModuleId");
  await db.insert(contratoModulos).values({ contratoId, baseModuleId }).onConflictDoNothing();
  const [c] = await db.select().from(contratos).where(eq(contratos.id, contratoId));
  await logEvent({ tipo: "modulo_vinculado", descricao: "Módulo vinculado ao contrato.", municipioId: c?.municipioId ?? null, baseModuleId, contratoId });
  await syncPendencias();
  done();
}

export async function desvincularModulo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const baseModuleId = req(fd, "baseModuleId");
  const { and } = await import("drizzle-orm");
  await db
    .delete(contratoModulos)
    .where(and(eq(contratoModulos.contratoId, contratoId), eq(contratoModulos.baseModuleId, baseModuleId)));
  const [c] = await db.select().from(contratos).where(eq(contratos.id, contratoId));
  await logEvent({ tipo: "modulo_desvinculado", descricao: "Módulo desvinculado do contrato (histórico do vínculo preservado no evento).", municipioId: c?.municipioId ?? null, baseModuleId, contratoId });
  await syncPendencias();
  done();
}

export async function createAditivo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const [row] = await db
    .insert(aditivos)
    .values({
      contratoId,
      tipo: str(fd, "tipo") ?? "alteracao_contratual",
      data: str(fd, "data") ?? today(),
      descricao: req(fd, "descricao"),
    })
    .returning();
  const [c] = await db.select().from(contratos).where(eq(contratos.id, contratoId));
  await logEvent({ tipo: "aditivo_criado", descricao: `Aditivo (${row.tipo}): ${row.descricao}`, municipioId: c?.municipioId ?? null, contratoId, data: row.data ?? today() });
  done();
}

/* ---------------- Documentos ---------------- */

export async function createDocumento(fd: FormData) {
  await requireServerActionPermission();
  const [row] = await db
    .insert(documentos)
    .values({
      tipo: str(fd, "tipo") ?? "outros",
      nome: req(fd, "nome"),
      referencia: str(fd, "referencia"),
      observacoes: str(fd, "observacoes"),
      municipioId: str(fd, "municipioId"),
      baseId: str(fd, "baseId"),
      baseModuleId: str(fd, "baseModuleId"),
      contratoId: str(fd, "contratoId"),
      eventoId: str(fd, "eventoId"),
    })
    .returning();
  await logEvent({ tipo: "documento_anexado", descricao: `Documento anexado: ${row.nome} (${row.tipo}).`, municipioId: row.municipioId, baseId: row.baseId, baseModuleId: row.baseModuleId, contratoId: row.contratoId });
  await syncPendencias();
  done();
}

/* ---------------- Pendências ---------------- */

export async function resolverPendencia(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  await db.update(pendencias).set({ situacao: "resolvida", resolvedAt: new Date() }).where(eq(pendencias.id, id));
  const [p] = await db.select().from(pendencias).where(eq(pendencias.id, id));
  await logEvent({ tipo: "pendencia_resolvida", descricao: `Pendência resolvida manualmente: ${p?.descricao ?? id}`, municipioId: p?.municipioId ?? null, baseId: p?.baseId ?? null, baseModuleId: p?.baseModuleId ?? null, contratoId: p?.contratoId ?? null });
  done();
}

export async function createPendencia(fd: FormData) {
  await requireServerActionPermission();
  await db.insert(pendencias).values({
    tipo: "manual",
    descricao: req(fd, "descricao"),
    origem: "manual",
    municipioId: str(fd, "municipioId"),
  });
  done();
}
