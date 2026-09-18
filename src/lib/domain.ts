import { inArray } from "drizzle-orm";
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
  pendencias,
  propostas,
} from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import type { Tone } from "@/lib/constants";
import { MODULE_CATALOG } from "@/lib/constants";
import { needsModuleEnabledEmailPending } from "@/lib/module-enabled-email";
import { contractedModuleIds, isContractDocumentType } from "@/lib/contract-reference";
import { norm, todayISO } from "@/lib/utils";

export type Municipio = typeof municipios.$inferSelect;
export type Base = typeof bases.$inferSelect;
export type BaseModule = typeof baseModules.$inferSelect;
export type Contrato = typeof contratos.$inferSelect;
export type ContratoModulo = typeof contratoModulos.$inferSelect;
export type Proposta = typeof propostas.$inferSelect;
export type Aditivo = typeof aditivos.$inferSelect;
export type Evento = typeof eventos.$inferSelect;
export type Documento = typeof documentos.$inferSelect;
export type Pendencia = typeof pendencias.$inferSelect;

/* ------------------------------------------------------------------ */
/* Registro de eventos (FASE 4 — toda ação relevante gera histórico)  */
/* ------------------------------------------------------------------ */

export async function logEvent(e: {
  tipo: string;
  descricao: string;
  municipioId?: string | null;
  baseId?: string | null;
  baseModuleId?: string | null;
  contratoId?: string | null;
  aditivoId?: string | null;
  data?: string;
  usuario?: string | null;
}) {
  const usuario = e.usuario ?? (await currentEventUser()) ?? "Equipe Interna";

  await db.insert(eventos).values({
    tipo: e.tipo,
    descricao: e.descricao,
    municipioId: e.municipioId ?? null,
    baseId: e.baseId ?? null,
    baseModuleId: e.baseModuleId ?? null,
    contratoId: e.contratoId ?? null,
    aditivoId: e.aditivoId ?? null,
    data: e.data ?? todayISO(),
    usuario,
  });
}

async function currentEventUser() {
  try {
    const session = await getCurrentSession();
    return session?.user.nome?.trim() || session?.user.email?.trim() || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Derivações de estado                                               */
/* ------------------------------------------------------------------ */

/** IDs de módulos vinculados a qualquer contrato cadastrado. */
export function contratadoSet(cms: ContratoModulo[]) {
  return contractedModuleIds(cms);
}

export interface ModuloState {
  key: string;
  label: string;
  tone: Tone;
}

/** Estados não equivalentes: contratado ≠ habilitado ≠ execução. */
export function moduloState(m: BaseModule, contratado: boolean): ModuloState {
  if (m.desabilitadoAt) return { key: "desabilitado", label: "Desabilitado", tone: "danger" };
  if (m.execucaoInicio) return { key: "execucao", label: "Em execução", tone: "success" };
  if (m.migracaoInicio && !m.migracaoFim) return { key: "migracao", label: "Em migração", tone: "warning" };
  if (m.habilitadoAt) return { key: "habilitado", label: "Habilitado", tone: "primary" };
  if (contratado) return { key: "contratado", label: "Contratado", tone: "primary" };
  return { key: "disponivel", label: "Disponível", tone: "muted" };
}

/* ------------------------------------------------------------------ */
/* FASE 5 — Pendências automáticas                                    */
/* ------------------------------------------------------------------ */

interface DesiredPendencia {
  key: string;
  tipo: string;
  descricao: string;
  municipioId?: string | null;
  baseId?: string | null;
  baseModuleId?: string | null;
  contratoId?: string | null;
}

/** Recalcula pendências automáticas; resolve as que deixaram de valer. */
export async function syncPendencias() {
  const [mods, cms, cs, bs, ms, docs, pends] = await Promise.all([
    db.select().from(baseModules),
    db.select().from(contratoModulos),
    db.select().from(contratos),
    db.select().from(bases),
    db.select().from(municipios),
    db.select().from(documentos),
    db.select().from(pendencias),
  ]);

  const baseById = new Map(bs.map((b) => [b.id, b]));
  const munById = new Map(ms.map((m) => [m.id, m]));
  const conSet = contratadoSet(cms);
  const desired: DesiredPendencia[] = [];

  for (const m of mods) {
    const base = baseById.get(m.baseId);
    if (!base) continue;
    const mun = munById.get(base.municipioId);
    const ctx = `${m.nome} · ${base.nome}${mun ? ` · ${mun.clienteNome}` : ""}`;
    const lixo = { municipioId: base.municipioId, baseId: base.id, baseModuleId: m.id };

    if (m.habilitadoAt && !m.desabilitadoAt && !conSet.has(m.id)) {
      desired.push({
        key: `habilitado_sem_contrato:${m.id}`,
        tipo: "habilitado_sem_contrato",
        descricao: `Módulo habilitado sem contrato formalizado — necessária formalização contratual (${ctx}).`,
        ...lixo,
      });
    }
    if (m.habilitadoAt && !m.solicitacaoAt && !m.desabilitadoAt) {
      desired.push({
        key: `habilitado_sem_solicitacao:${m.id}`,
        tipo: "habilitado_sem_solicitacao",
        descricao: `Módulo habilitado sem registro de solicitação (${ctx}).`,
        ...lixo,
      });
    }
    if (needsModuleEnabledEmailPending({
      enabledAt: m.habilitadoAt,
      requesterEmail: m.solicitanteEmail,
      sentAt: m.habilitacaoEmailEnviadoAt,
    })) {
      desired.push({
        key: `email_habilitacao_nao_enviado:${m.id}`,
        tipo: "email_habilitacao_nao_enviado",
        descricao: `E-mail de aviso da habilitação não enviado ao solicitante (${ctx}).`,
        ...lixo,
      });
    }
    if (conSet.has(m.id) && !m.habilitadoAt && !m.desabilitadoAt) {
      desired.push({
        key: `contratado_nao_habilitado:${m.id}`,
        tipo: "contratado_nao_habilitado",
        descricao: `Módulo contratado ainda não habilitado (${ctx}).`,
        ...lixo,
      });
    }
  }

  for (const c of cs) {
    const mun = munById.get(c.municipioId);
    const ctx = `Contrato ${c.numero}${mun ? ` · ${mun.clienteNome}` : ""}`;
    const temAnexo = docs.some((d) => d.contratoId === c.id && isContractDocumentType(d.tipo));
    if (!temAnexo) {
      desired.push({
        key: `documento_ausente:${c.id}`,
        tipo: "documento_ausente",
        descricao: `${ctx} sem anexo de contrato.`,
        municipioId: c.municipioId,
        contratoId: c.id,
      });
    }
  }

  for (const b of bs) {
    if (b.situacao !== "ativa" || b.cnpj) continue;
    const mun = munById.get(b.municipioId);
    desired.push({
      key: `base_incompleta:${b.id}`,
      tipo: "base_incompleta",
      descricao: `Base ${b.nome}${mun ? ` · ${mun.clienteNome}` : ""} criada sem informações suficientes (CNPJ ausente).`,
      municipioId: b.municipioId,
      baseId: b.id,
    });
  }

  const desiredKeys = new Map(desired.map((d) => [d.key, d]));
  const openAuto = pends.filter((p) => p.situacao === "aberta" && p.origem === "auto");
  const openKeys = new Set(
    openAuto.map((p) => `${p.tipo}:${p.baseModuleId ?? p.baseId ?? p.contratoId}`),
  );

  const toResolve = openAuto.filter(
    (p) => !desiredKeys.has(`${p.tipo}:${p.baseModuleId ?? p.baseId ?? p.contratoId}`),
  );
  if (toResolve.length > 0) {
    await db
      .update(pendencias)
      .set({ situacao: "resolvida", resolvedAt: new Date() })
      .where(
        inArray(
          pendencias.id,
          toResolve.map((p) => p.id),
        ),
      );
  }

  const toInsert = desired.filter((d) => !openKeys.has(d.key));
  if (toInsert.length > 0) {
    await db.insert(pendencias).values(
      toInsert.map((d) => ({
        tipo: d.tipo,
        descricao: d.descricao,
        origem: "auto",
        municipioId: d.municipioId ?? null,
        baseId: d.baseId ?? null,
        baseModuleId: d.baseModuleId ?? null,
        contratoId: d.contratoId ?? null,
      })),
    );
  }
}

/* ------------------------------------------------------------------ */
/* FASE 6 — Inteligência comercial (oportunidades)                    */
/* ------------------------------------------------------------------ */

export interface Oportunidade {
  municipio: Municipio;
  missing: string[];
}

export function computeOportunidades(
  ms: Municipio[],
  bs: Base[],
  mods: BaseModule[],
): Oportunidade[] {
  const baseById = new Map(bs.map((b) => [b.id, b]));
  const out: Oportunidade[] = [];
  for (const m of ms) {
    if (!["cliente_ativo", "em_negociacao"].includes(m.situacao)) continue;
    const owned = new Set(
      mods
        .filter((mod) => baseById.get(mod.baseId)?.municipioId === m.id)
        .map((mod) => norm(mod.nome)),
    );
    if (owned.size === 0) continue;
    const missing = MODULE_CATALOG.filter((c) => !owned.has(norm(c)));
    if (missing.length > 0) out.push({ municipio: m, missing });
  }
  return out.sort((a, b) => a.missing.length - b.missing.length);
}
