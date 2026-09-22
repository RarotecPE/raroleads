"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  baseModules,
  bases,
  contratoModulos,
  contratos,
  documentos,
  eventos,
  municipios,
  moduloResponsaveis,
  propostas,
} from "@/db/schema";
import { requireServerActionPermission } from "@/lib/auth";
import { planBaseDisable, planBaseReactivation } from "@/lib/base-disable";
import { cnpjDigits } from "@/lib/cnpj";
import { basesMissingModule, parseNewChildBases, validateChildBaseLinks } from "@/lib/base-hierarchy";
import {
  optLabel,
} from "@/lib/constants";
import { deleteDocumentFile, fileFromFormData, uploadDocumentFile } from "@/lib/document-storage";
import { CONTRACT_DOCUMENT_TYPE, CONTRACT_UNLINK_REASONS, documentTypeForContext, validateBaseAvailability, validateContractModuleSelection } from "@/lib/contract-reference";
import { logEvent, syncPendencias } from "@/lib/domain";
import {
  attemptModuleEnabledEmail,
  moduleEnabledRequesterEmail,
  moduleEnabledRequestOrigin,
} from "@/lib/module-enabled-email";
import { norm } from "@/lib/utils";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const phoneDigits = (fd: FormData, k: string) => str(fd, k)?.replace(/\D/g, "").slice(0, 11) ?? null;
const cnpjValue = (fd: FormData, k: string) => {
  const digits = cnpjDigits(str(fd, k) ?? "");
  return digits || null;
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
const newId = () => crypto.randomUUID();
const CLIENTE_ENCERRADO = "cliente_encerrado";
const MODULO_DUPLICADO_MESSAGE = "Módulo já vinculado a base!";
const MODULO_DESABILITADO_PELA_BASE = "Desabilitação da base";
const today = () => new Date().toISOString().slice(0, 10);

async function assertClienteOperacional(municipioId: string | null | undefined) {
  if (!municipioId) return;
  const [cliente] = await db.select().from(municipios).where(eq(municipios.id, municipioId));
  if (cliente?.situacao === CLIENTE_ENCERRADO) {
    throw new Error("Cliente encerrado. Reabra o cadastro do cliente antes de realizar novas alterações operacionais.");
  }
}

async function assertBaseCadastrada(baseId: string) {
  const [base] = await db.select().from(bases).where(eq(bases.id, baseId));
  if (!base) {
    throw new Error("Base nao encontrada.");
  }
  await assertClienteOperacional(base?.municipioId);
  return base;
}

async function assertBaseOperacional(baseId: string) {
  const base = await assertBaseCadastrada(baseId);
  if (base.situacao !== "ativa") {
    throw new Error("Base desabilitada. Reative a base antes de realizar alterações operacionais.");
  }
  return base;
}

async function assertModuloOperacional(baseModuleId: string) {
  const [modulo] = await db.select().from(baseModules).where(eq(baseModules.id, baseModuleId));
  if (!modulo) {
    throw new Error("Modulo nao encontrado.");
  }
  await assertBaseOperacional(modulo.baseId);
  return modulo;
}

async function assertContratoOperacional(contratoId: string) {
  const [contrato] = await db.select().from(contratos).where(eq(contratos.id, contratoId));
  if (!contrato) {
    throw new Error("Contrato nao encontrado.");
  }
  await assertClienteOperacional(contrato.municipioId);
  return contrato;
}

async function assertPropostaOperacional(propostaId: string) {
  const [proposta] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
  if (!proposta) {
    throw new Error("Proposta nao encontrada.");
  }
  if (proposta.excluidaAt) {
    throw new Error("Proposta nao encontrada.");
  }
  if (proposta.situacao === "cancelada") {
    throw new Error("Proposta cancelada nao pode receber alteracoes.");
  }
  await assertClienteOperacional(proposta.municipioId);
  return proposta;
}

async function assertResponsavelOperacional(responsavelId: string) {
  const [responsavel] = await db.select().from(moduloResponsaveis).where(eq(moduloResponsaveis.id, responsavelId));
  if (!responsavel) {
    throw new Error("Responsavel nao encontrado.");
  }
  await assertClienteOperacional(responsavel.municipioId);
  return responsavel;
}

async function assertDocumentoContextoOperacional(fd: FormData, municipioId: string) {
  await assertClienteOperacional(municipioId);
  const baseId = str(fd, "baseId");
  const baseModuleId = str(fd, "baseModuleId");
  const propostaId = str(fd, "propostaId");
  const contratoId = str(fd, "contratoId");
  if (baseId) await assertBaseOperacional(baseId);
  if (baseModuleId) await assertModuloOperacional(baseModuleId);
  if (propostaId) await assertPropostaOperacional(propostaId);
  if (contratoId) await assertContratoOperacional(contratoId);
}

function sameText(value: string | null | undefined) {
  return value?.trim() || null;
}

function describeValue(value: string | number | null | undefined, empty = "nao informado") {
  return value === null || value === undefined || value === "" ? empty : String(value);
}

function clienteChangeDescription(
  before: typeof municipios.$inferSelect,
  after: {
    clienteNome: string;
    municipio: string;
    uf: string;
    codigoIbge: string | null;
    populacao: number | null;
    situacao: string;
    dadosAdministrativos: string | null;
    observacoes: string | null;
  },
) {
  const changes: string[] = [];
  if (before.clienteNome !== after.clienteNome) {
    changes.push(`Nome do cliente de "${before.clienteNome}" para "${after.clienteNome}"`);
  }
  if (before.municipio !== after.municipio) {
    changes.push(`Municipio de "${before.municipio}" para "${after.municipio}"`);
  }
  if (before.uf !== after.uf) {
    changes.push(`UF de ${before.uf} para ${after.uf}`);
  }
  if (sameText(before.codigoIbge) !== sameText(after.codigoIbge)) {
    changes.push(`Codigo IBGE de ${describeValue(before.codigoIbge)} para ${describeValue(after.codigoIbge)}`);
  }
  if (before.populacao !== after.populacao) {
    changes.push(`Populacao estimada de ${describeValue(before.populacao)} para ${describeValue(after.populacao)}`);
  }
  if (before.situacao !== after.situacao) {
    changes.push(`Situacao de ${optLabel(before.situacao)} para ${optLabel(after.situacao)}`);
  }
  if (sameText(before.dadosAdministrativos) !== sameText(after.dadosAdministrativos)) {
    changes.push("Dados administrativos alterados");
  }
  if (sameText(before.observacoes) !== sameText(after.observacoes)) {
    changes.push("Observacoes alteradas");
  }
  return changes.length ? `Cliente atualizado: ${changes.join("; ")}.` : null;
}

/* ---------------- Clientes ---------------- */

export async function createMunicipio(fd: FormData) {
  await requireServerActionPermission();
  const clienteNome = req(fd, "clienteNome");
  const municipio = req(fd, "municipio");
  const [row] = await db
    .insert(municipios)
    .values({
      clienteNome,
      municipio,
      uf: req(fd, "uf").toUpperCase().slice(0, 2),
      codigoIbge: str(fd, "codigoIbge"),
      populacao: int(fd, "populacao"),
      situacao: str(fd, "situacao") ?? "prospect",
      dadosAdministrativos: str(fd, "dadosAdministrativos"),
      observacoes: str(fd, "observacoes"),
    })
    .returning();
  await logEvent({ tipo: "municipio_criado", descricao: `Cliente ${clienteNome} criado.`, municipioId: row.id });
  await syncPendencias();
  done();
}

export async function updateMunicipio(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const [before] = await db.select().from(municipios).where(eq(municipios.id, id));
  if (!before) {
    throw new Error("Cliente nao encontrado.");
  }
  const next = {
    clienteNome: req(fd, "clienteNome"),
    municipio: req(fd, "municipio"),
    uf: req(fd, "uf").toUpperCase().slice(0, 2),
    codigoIbge: str(fd, "codigoIbge"),
    populacao: int(fd, "populacao"),
    situacao: str(fd, "situacao") ?? "prospect",
    dadosAdministrativos: str(fd, "dadosAdministrativos"),
    observacoes: str(fd, "observacoes"),
  };
  await db
    .update(municipios)
    .set(next)
    .where(eq(municipios.id, id));
  const descricao = clienteChangeDescription(before, next);
  if (descricao) {
    await logEvent({ tipo: "municipio_atualizado", descricao, municipioId: id });
  }
  await syncPendencias();
  done();
}

/* ---------------- Bases ---------------- */

export async function createBase(fd: FormData) {
  const session = await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertClienteOperacional(municipioId);
  const nome = req(fd, "nome");
  const newChildren = parseNewChildBases(str(fd, "inferioresNovas"));
  const existingChildIds = fd.getAll("inferioresExistentesIds").filter((item): item is string => typeof item === "string" && item.trim() !== "");
  const usuario = session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";
  await db.transaction(async (tx) => {
    const allBases = await tx.select().from(bases).where(eq(bases.municipioId, municipioId)).orderBy(bases.id).for("update");
    validateChildBaseLinks(null, municipioId, existingChildIds, newChildren, allBases);
    const [row] = await tx.insert(bases).values({
      municipioId,
      nome,
      tipo: str(fd, "tipo") ?? "outros",
      cnpj: cnpjValue(fd, "cnpj"),
      observacoes: str(fd, "observacoes"),
    }).returning();
    await tx.insert(eventos).values({ tipo: "base_criada", descricao: `Base ${nome} criada.`, municipioId, baseId: row.id, data: today(), usuario });
    if (newChildren.length > 0) {
      const created = await tx.insert(bases).values(newChildren.map((child) => ({ ...child, municipioId, baseSuperiorId: row.id }))).returning();
      await tx.insert(eventos).values(created.map((child) => ({
        tipo: "base_criada", descricao: `Base ${child.nome} criada com ${nome} como base superior.`, municipioId, baseId: child.id, data: today(), usuario,
      })));
    }
    if (existingChildIds.length > 0) {
      await tx.update(bases).set({ baseSuperiorId: row.id }).where(inArray(bases.id, existingChildIds));
      await tx.insert(eventos).values(existingChildIds.map((id) => ({
        tipo: "base_vinculada_superior", descricao: `Base ${allBases.find((item) => item.id === id)?.nome} vinculada à base superior ${nome}.`, municipioId, baseId: id, data: today(), usuario,
      })));
    }
  });
  await syncPendencias();
  done();
}

export async function updateBase(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = req(fd, "id");
  const base = await assertBaseCadastrada(id);
  const municipioId = base.municipioId;
  const nome = req(fd, "nome");
  const newChildren = parseNewChildBases(str(fd, "inferioresNovas"));
  const existingChildIds = fd.getAll("inferioresExistentesIds").filter((item): item is string => typeof item === "string" && item.trim() !== "");
  const usuario = session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";
  await db.transaction(async (tx) => {
    const allBases = await tx.select().from(bases).where(eq(bases.municipioId, municipioId)).orderBy(bases.id).for("update");
    const current = allBases.find((item) => item.id === id);
    if (!current) throw new Error("Base não encontrada.");
    validateChildBaseLinks(current, municipioId, existingChildIds, newChildren, allBases);
    await tx.update(bases).set({
      nome,
      tipo: str(fd, "tipo") ?? "outros",
      cnpj: cnpjValue(fd, "cnpj"),
      observacoes: str(fd, "observacoes"),
    }).where(eq(bases.id, id));
    await tx.insert(eventos).values({ tipo: "base_atualizada", descricao: `Base ${nome} atualizada.`, municipioId, baseId: id, data: today(), usuario });
    if (newChildren.length > 0) {
      const created = await tx.insert(bases).values(newChildren.map((child) => ({ ...child, municipioId, baseSuperiorId: id }))).returning();
      await tx.insert(eventos).values(created.map((child) => ({
        tipo: "base_criada", descricao: `Base ${child.nome} criada com ${nome} como base superior.`, municipioId, baseId: child.id, data: today(), usuario,
      })));
    }
    if (existingChildIds.length > 0) {
      await tx.update(bases).set({ baseSuperiorId: id }).where(inArray(bases.id, existingChildIds));
      await tx.insert(eventos).values(existingChildIds.map((childId) => ({
        tipo: "base_vinculada_superior", descricao: `Base ${allBases.find((item) => item.id === childId)?.nome} vinculada à base superior ${nome}.`, municipioId, baseId: childId, data: today(), usuario,
      })));
    }
  });
  await syncPendencias();
  done();
}

export async function desvincularBaseSuperior(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = req(fd, "id");
  const base = await assertBaseCadastrada(id);
  const usuario = session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";
  await db.transaction(async (tx) => {
    const allBases = await tx.select().from(bases).where(eq(bases.municipioId, base.municipioId)).orderBy(bases.id).for("update");
    const current = allBases.find((item) => item.id === id);
    if (!current?.baseSuperiorId) throw new Error("Esta base não possui base superior.");
    const superior = allBases.find((item) => item.id === current.baseSuperiorId);
    await tx.update(bases).set({ baseSuperiorId: null }).where(eq(bases.id, id));
    await tx.insert(eventos).values({
      tipo: "base_desvinculada_superior", descricao: `Base ${current.nome} desvinculada da base superior ${superior?.nome ?? "anterior"}.`,
      municipioId: base.municipioId, baseId: id, data: today(), usuario,
    });
  });
  done();
}

export async function desabilitarBase(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = req(fd, "id");
  const motivo = req(fd, "motivo");
  const data = today();
  const usuario = session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";

  await db.transaction(async (tx) => {
    const [requestedBase] = await tx.select().from(bases).where(eq(bases.id, id));
    if (!requestedBase) throw new Error("Base nao encontrada.");
    await assertClienteOperacional(requestedBase.municipioId);

    const allBases = await tx
      .select()
      .from(bases)
      .where(eq(bases.municipioId, requestedBase.municipioId))
      .orderBy(bases.id)
      .for("update");
    const scopeBaseIds = [id, ...allBases.filter((base) => base.baseSuperiorId === id).map((base) => base.id)];
    const allModules = await tx
      .select()
      .from(baseModules)
      .where(inArray(baseModules.baseId, scopeBaseIds))
      .orderBy(baseModules.id)
      .for("update");
    const plan = planBaseDisable(id, allBases, allModules);

    if (plan.baseIdsToDisable.length > 0) {
      await tx
        .update(bases)
        .set({
          situacao: "inativa",
          desabilitadoAt: data,
          desabilitadoMotivo: motivo,
          desabilitacaoOrigemBaseId: id,
        })
        .where(inArray(bases.id, plan.baseIdsToDisable));
      await tx.insert(eventos).values(plan.baseIdsToDisable.map((baseId) => ({
        tipo: "base_desabilitada",
        descricao: `Base ${allBases.find((base) => base.id === baseId)?.nome ?? ""} desabilitada. Motivo: ${motivo}`,
        municipioId: requestedBase.municipioId,
        baseId,
        data,
        usuario,
      })));
    }

    if (plan.moduleIdsToDisable.length > 0) {
      await tx
        .update(baseModules)
        .set({
          desabilitadoAt: data,
          desabilitadoMotivo: MODULO_DESABILITADO_PELA_BASE,
          desabilitadoJustificativa: motivo,
          desabilitacaoOrigemBaseId: id,
        })
        .where(inArray(baseModules.id, plan.moduleIdsToDisable));
      await tx.insert(eventos).values(plan.moduleIdsToDisable.map((moduleId) => ({
        tipo: "desabilitado",
        descricao: `Módulo desabilitado pela base ${requestedBase.nome}. Motivo: ${motivo}`,
        municipioId: requestedBase.municipioId,
        baseModuleId: moduleId,
        data,
        usuario,
      })));
    }
  });
  await syncPendencias();
  done();
}

export async function reabilitarBase(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = req(fd, "id");
  const data = today();
  const usuario = session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";

  await db.transaction(async (tx) => {
    const [requestedBase] = await tx.select().from(bases).where(eq(bases.id, id));
    if (!requestedBase) throw new Error("Base nao encontrada.");
    await assertClienteOperacional(requestedBase.municipioId);

    const allBases = await tx
      .select()
      .from(bases)
      .where(eq(bases.municipioId, requestedBase.municipioId))
      .orderBy(bases.id)
      .for("update");
    const allModules = await tx
      .select()
      .from(baseModules)
      .where(inArray(baseModules.baseId, allBases.map((base) => base.id)))
      .orderBy(baseModules.id)
      .for("update");
    const plan = planBaseReactivation(id, allBases, allModules);

    if (plan.baseIdsToReactivate.length > 0) {
      await tx
        .update(bases)
        .set({
          situacao: "ativa",
          desabilitadoAt: null,
          desabilitadoMotivo: null,
          desabilitacaoOrigemBaseId: null,
        })
        .where(inArray(bases.id, plan.baseIdsToReactivate));
      await tx.insert(eventos).values(plan.baseIdsToReactivate.map((baseId) => ({
        tipo: "base_reabilitada",
        descricao: `Base ${allBases.find((base) => base.id === baseId)?.nome ?? ""} reabilitada pela base ${requestedBase.nome}.`,
        municipioId: requestedBase.municipioId,
        baseId,
        data,
        usuario,
      })));
    }

    if (plan.moduleIdsToReactivate.length > 0) {
      await tx
        .update(baseModules)
        .set({
          desabilitadoAt: null,
          desabilitadoMotivo: null,
          desabilitadoJustificativa: null,
          desabilitacaoOrigemBaseId: null,
        })
        .where(inArray(baseModules.id, plan.moduleIdsToReactivate));
      await tx.insert(eventos).values(plan.moduleIdsToReactivate.map((moduleId) => ({
        tipo: "reabilitado",
        descricao: `Módulo reabilitado pela base ${requestedBase.nome}; histórico de desabilitação preservado.`,
        municipioId: requestedBase.municipioId,
        baseModuleId: moduleId,
        data,
        usuario,
      })));
    }
  });
  await syncPendencias();
  done();
}

/* ---------------- Módulos ---------------- */

export async function createModulo(fd: FormData) {
  const session = await requireServerActionPermission();
  const baseId = req(fd, "baseId");
  const base = await assertBaseOperacional(baseId);
  const municipioId = base.municipioId;
  if (str(fd, "municipioId") !== municipioId) throw new Error("A base deve pertencer ao cliente selecionado.");
  const nome = req(fd, "nome");
  const observacoes = str(fd, "observacoes");
  const replicar = fd.get("replicarInferiores") === "on";
  const responsavelNome = str(fd, "responsavelNome");
  const responsavelEmail = str(fd, "responsavelEmail");
  const responsavelCelular = phoneDigits(fd, "responsavelCelular");
  const deveCriarResponsavel = !!responsavelNome || !!responsavelEmail || !!responsavelCelular;

  if (deveCriarResponsavel && !responsavelNome) {
    throw new Error("Informe o nome do responsavel pelo modulo, ou deixe todos os campos de responsavel vazios.");
  }

  const usuario = session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";
  await db.transaction(async (tx) => {
    const allBases = await tx.select().from(bases).where(eq(bases.municipioId, municipioId)).orderBy(bases.id).for("update");
    const current = allBases.find((item) => item.id === baseId);
    if (!current) throw new Error("Base não encontrada.");
    const children = allBases.filter((item) => item.baseSuperiorId === baseId);
    const activeChildren = children.filter((item) => item.situacao === "ativa");
    if (replicar && (current.baseSuperiorId || children.length === 0)) {
      throw new Error("A replicação exige uma base superior com bases inferiores.");
    }
    const targetIds = [baseId, ...(replicar ? activeChildren.map((child) => child.id) : [])];
    const existing = await tx.select({ baseId: baseModules.baseId, nome: baseModules.nome }).from(baseModules).where(inArray(baseModules.baseId, targetIds));
    if (existing.some((module) => module.baseId === baseId && norm(module.nome.trim()) === norm(nome.trim()))) {
      throw new Error(MODULO_DUPLICADO_MESSAGE);
    }
    const [modulo] = await tx
      .insert(baseModules)
      .values({ baseId, nome, observacoes })
      .returning();

    if (deveCriarResponsavel && responsavelNome) {
      await tx.insert(moduloResponsaveis).values({
        municipioId,
        baseModuleId: modulo.id,
        nome: responsavelNome,
        email: responsavelEmail,
        celular: responsavelCelular,
      });
    }
    await tx.insert(eventos).values({
      tipo: "modulo_criado", descricao: `Módulo ${nome} criado na base.`, municipioId, baseId, baseModuleId: modulo.id, data: today(), usuario,
    });
    if (replicar) {
      const missing = basesMissingModule(activeChildren, existing, nome);
      if (missing.length > 0) {
        const copies = await tx.insert(baseModules).values(missing.map((child) => ({ baseId: child.id, nome, observacoes }))).returning();
        await tx.insert(eventos).values(copies.map((copy) => ({
          tipo: "modulo_replicado", descricao: `Módulo ${nome} replicado da base ${base.nome}.`,
          municipioId, baseId: copy.baseId, baseModuleId: copy.id, data: today(), usuario,
        })));
      }
    }
  });
  await syncPendencias();
  done();
}

export async function createModulosEmGrupo(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertClienteOperacional(municipioId);
  const nome = req(fd, "nome");
  const observacoes = str(fd, "observacoes");
  const baseIds = [...new Set(fd.getAll("baseIds").filter((v): v is string => typeof v === "string" && v.trim() !== ""))];

  if (baseIds.length === 0) {
    throw new Error("Selecione ao menos uma base para cadastrar o modulo.");
  }

  const selectedBases = await db.select().from(bases).where(inArray(bases.id, baseIds));
  if (selectedBases.length !== baseIds.length || selectedBases.some((base) => base.municipioId !== municipioId)) {
    throw new Error("Selecione apenas bases validas deste cliente.");
  }
  if (selectedBases.some((base) => base.situacao !== "ativa")) {
    throw new Error("Não é permitido cadastrar módulos em uma base desabilitada.");
  }

  const existingModules = await db.select().from(baseModules).where(inArray(baseModules.baseId, baseIds));
  const normalizedNome = norm(nome);
  const existingBaseIds = new Set(
    existingModules.filter((modulo) => norm(modulo.nome) === normalizedNome).map((modulo) => modulo.baseId),
  );
  const basesParaCriar = selectedBases.filter((base) => !existingBaseIds.has(base.id));

  if (basesParaCriar.length === 0) {
    throw new Error(MODULO_DUPLICADO_MESSAGE);
  }

  const rows = await db.transaction(async (tx) => tx
    .insert(baseModules)
    .values(basesParaCriar.map((base) => ({ baseId: base.id, nome, observacoes })))
    .returning());

  for (const row of rows) {
    await logEvent({ tipo: "modulo_criado", descricao: `Módulo ${nome} criado na base.`, municipioId, baseId: row.baseId, baseModuleId: row.id });
  }
  await syncPendencias();
  done();
}

export async function createResponsavelModulo(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  const baseModuleId = req(fd, "baseModuleId");
  await assertModuloOperacional(baseModuleId);
  await assertClienteOperacional(municipioId);
  const nome = req(fd, "nome");
  await db.insert(moduloResponsaveis).values({
    municipioId,
    baseModuleId,
    nome,
    email: str(fd, "email"),
    celular: phoneDigits(fd, "celular"),
  });
  await logEvent({ tipo: "responsavel_criado", descricao: `Responsavel ${nome} vinculado ao modulo.`, municipioId, baseModuleId });
  done();
}

export async function updateResponsavelModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const responsavel = await assertResponsavelOperacional(id);
  const municipioId = responsavel.municipioId;
  const baseModuleId = responsavel.baseModuleId;
  const nome = req(fd, "nome");
  await db
    .update(moduloResponsaveis)
    .set({
      nome,
      email: str(fd, "email"),
      celular: phoneDigits(fd, "celular"),
    })
    .where(eq(moduloResponsaveis.id, id));
  await logEvent({ tipo: "responsavel_atualizado", descricao: `Responsavel ${nome} atualizado.`, municipioId, baseModuleId });
  done();
}

export async function deleteResponsavelModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const responsavel = await assertResponsavelOperacional(id);
  const municipioId = responsavel.municipioId;
  const baseModuleId = responsavel.baseModuleId;
  const nome = str(fd, "nome") ?? "Responsavel";
  await db.delete(moduloResponsaveis).where(eq(moduloResponsaveis.id, id));
  await logEvent({ tipo: "responsavel_removido", descricao: `${nome} removido e desvinculado do modulo.`, municipioId, baseModuleId });
  done();
}

export async function habilitarModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const modulo = await assertModuloOperacional(id);
  const [base] = await db.select().from(bases).where(eq(bases.id, modulo.baseId));
  if (!base) throw new Error("Base nao encontrada.");
  const municipioId = base.municipioId;
  const solicitacaoAt = str(fd, "solicitacaoAt");
  const habilitadoAt = req(fd, "habilitadoAt");
  const solicitante = str(fd, "solicitante");
  const solicitanteEmail = moduleEnabledRequesterEmail(solicitante, str(fd, "solicitanteEmail"));
  const origem = moduleEnabledRequestOrigin(solicitante, str(fd, "origem"));
  await db
    .update(baseModules)
    .set({
      habilitadoAt,
      solicitacaoAt,
      solicitante,
      solicitanteEmail,
      habilitacaoEmailEnviadoAt: null,
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
  const [cliente] = await db.select().from(municipios).where(eq(municipios.id, municipioId));
  if (solicitanteEmail) {
    const emailEnviado = await attemptModuleEnabledEmail({
      moduleId: modulo.id,
      moduleName: modulo.nome,
      baseName: base.nome,
      municipalityId: municipioId,
      customerName: cliente?.clienteNome ?? "Cliente",
      enabledAt: habilitadoAt,
      requesterName: solicitante,
      requesterEmail: solicitanteEmail,
      requestOrigin: origem,
    });

    if (emailEnviado) {
      await db
        .update(baseModules)
        .set({ habilitacaoEmailEnviadoAt: new Date() })
        .where(eq(baseModules.id, id));
      await logEvent({
        tipo: "aviso_habilitacao_email_enviado",
        descricao: "Aviso de habilitação enviado ao solicitante.",
        municipioId,
        baseModuleId: id,
        data: habilitadoAt,
      });
    } else {
      await logEvent({
        tipo: "aviso_habilitacao_email_falhou",
        descricao: "Não foi possível enviar o aviso de habilitação ao solicitante. Uma pendência foi gerada para reenvio.",
        municipioId,
        baseModuleId: id,
        data: habilitadoAt,
      });
    }
  } else {
    await logEvent({
      tipo: "aviso_habilitacao_email_ignorado",
      descricao: "Aviso de habilitação não enviado porque nenhum solicitante foi informado.",
      municipioId,
      baseModuleId: id,
      data: habilitadoAt,
    });
  }
  await syncPendencias();
  done();
}

export async function updateModuloObservacoes(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const modulo = await assertModuloOperacional(id);
  const base = await assertBaseOperacional(modulo.baseId);
  const observacoes = str(fd, "observacoes");
  if (sameText(modulo.observacoes) === observacoes) return;

  await db.update(baseModules).set({ observacoes }).where(eq(baseModules.id, id));
  await logEvent({
    tipo: "modulo_observacoes",
    descricao: `Observações do módulo ${modulo.nome} atualizadas.`,
    municipioId: base.municipioId,
    baseId: base.id,
    baseModuleId: id,
  });
  done();
}

export async function reenviarEmailHabilitacao(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "baseModuleId");
  const [modulo] = await db.select().from(baseModules).where(eq(baseModules.id, id));
  if (!modulo?.habilitadoAt) throw new Error("Módulo habilitado não encontrado.");

  const solicitanteEmail = moduleEnabledRequesterEmail(modulo.solicitante, modulo.solicitanteEmail);
  if (!solicitanteEmail) throw new Error("O módulo não possui e-mail de solicitante para reenvio.");

  const [base] = await db.select().from(bases).where(eq(bases.id, modulo.baseId));
  if (!base) throw new Error("Base nao encontrada.");
  const [cliente] = await db.select().from(municipios).where(eq(municipios.id, base.municipioId));

  const emailEnviado = await attemptModuleEnabledEmail({
    moduleId: modulo.id,
    moduleName: modulo.nome,
    baseName: base.nome,
    municipalityId: base.municipioId,
    customerName: cliente?.clienteNome ?? "Cliente",
    enabledAt: modulo.habilitadoAt,
    requesterName: modulo.solicitante,
    requesterEmail: solicitanteEmail,
    requestOrigin: modulo.solicitacaoOrigem,
  });

  if (emailEnviado) {
    await db
      .update(baseModules)
      .set({ habilitacaoEmailEnviadoAt: new Date() })
      .where(eq(baseModules.id, id));
    await logEvent({
      tipo: "aviso_habilitacao_email_reenviado",
      descricao: "Aviso de habilitação reenviado ao solicitante; pendência resolvida.",
      municipioId: base.municipioId,
      baseModuleId: id,
      data: modulo.habilitadoAt,
    });
  } else {
    await logEvent({
      tipo: "aviso_habilitacao_email_reenvio_falhou",
      descricao: "Nova tentativa de envio do aviso de habilitação falhou; pendência mantida.",
      municipioId: base.municipioId,
      baseModuleId: id,
      data: modulo.habilitadoAt,
    });
  }
  await syncPendencias();
  done();
}

export async function migracaoModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  await assertModuloOperacional(id);
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

export async function implantacaoModulo(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  await assertModuloOperacional(id);
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
  await assertModuloOperacional(id);
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
  await assertModuloOperacional(id);
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
  await assertModuloOperacional(id);
  const municipioId = str(fd, "municipioId");
  await db
    .update(baseModules)
    .set({ desabilitadoAt: null, desabilitadoMotivo: null, desabilitadoJustificativa: null })
    .where(eq(baseModules.id, id));
  await logEvent({ tipo: "reabilitado", descricao: "Módulo reabilitado (histórico de desabilitação preservado).", municipioId, baseModuleId: id });
  await syncPendencias();
  done();
}

/* ---------------- Contratos ---------------- */

export async function createContrato(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertClienteOperacional(municipioId);
  const basesDoCliente = await db
    .select({ id: bases.id })
    .from(bases)
    .where(and(eq(bases.municipioId, municipioId), eq(bases.situacao, "ativa")));
  if (basesDoCliente.length === 0) {
    throw new Error("O cliente não possui base cadastrada para serem vinculadas ao contrato.");
  }

  const baseModuleIds = [
    ...new Set(
      fd
        .getAll("baseModuleIds")
        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
        .map((value) => value.trim()),
    ),
  ];
  if (baseModuleIds.length === 0) validateContractModuleSelection(baseModuleIds, [], []);
  const modulosSelecionados = await db
    .select({ id: baseModules.id, baseId: baseModules.baseId })
    .from(baseModules)
    .where(inArray(baseModules.id, baseModuleIds));
  validateContractModuleSelection(baseModuleIds, modulosSelecionados, basesDoCliente.map((base) => base.id));
  const selectedBaseIds = [...new Set(modulosSelecionados.map((modulo) => modulo.baseId))];

  const arquivo = fileFromFormData(fd);
  if (!arquivo) throw new Error("Selecione um arquivo para anexar ao contrato.");
  let uploadedKey: string | null = null;
  const row = await db.transaction(async (tx) => {
    await tx.select({ id: bases.id }).from(bases).where(inArray(bases.id, selectedBaseIds)).orderBy(bases.id).for("update");
    const existingLinks = await tx
      .select({ baseId: baseModules.baseId, contratoId: contratoModulos.contratoId })
      .from(contratoModulos)
      .innerJoin(baseModules, eq(baseModules.id, contratoModulos.baseModuleId))
      .where(inArray(baseModules.baseId, selectedBaseIds));
    validateBaseAvailability(selectedBaseIds, existingLinks);
    const [contrato] = await tx
      .insert(contratos)
      .values({
        municipioId,
        numero: req(fd, "numero"),
        modalidade: str(fd, "modalidade") ?? "outros",
        processo: str(fd, "processo"),
        observacoes: str(fd, "observacoes"),
      })
      .returning();

    if (arquivo) {
      const documentoId = newId();
      const uploaded = await uploadDocumentFile(arquivo, municipioId, documentoId);
      uploadedKey = uploaded.key;
      await tx.insert(documentos).values({
        id: documentoId,
        municipioId,
        contratoId: contrato.id,
        tipo: CONTRACT_DOCUMENT_TYPE,
        nome: uploaded.originalName,
        storageKey: uploaded.key,
        mimeType: uploaded.contentType,
        tamanhoBytes: uploaded.size,
        arquivoNomeOriginal: uploaded.originalName,
      });
    }

    if (baseModuleIds.length > 0) {
      await tx.insert(contratoModulos).values(
        baseModuleIds.map((baseModuleId) => ({ contratoId: contrato.id, baseModuleId })),
      );
    }

    return contrato;
  }).catch(async (error) => {
    if (uploadedKey) await deleteDocumentFile(uploadedKey).catch(() => undefined);
    throw error;
  });
  await logEvent({ tipo: "contrato_criado", descricao: `Contrato ${row.numero} criado.`, municipioId, contratoId: row.id });
  await syncPendencias();
  done();
}

export async function vincularModulo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const baseModuleId = req(fd, "baseModuleId");
  const c = await assertContratoOperacional(contratoId);
  const modulo = await assertModuloOperacional(baseModuleId);
  const base = await assertBaseOperacional(modulo.baseId);
  if (base.municipioId !== c.municipioId) {
    throw new Error("O módulo deve pertencer ao cliente deste contrato.");
  }
  const inserted = await db.transaction(async (tx) => {
    await tx.select({ id: bases.id }).from(bases).where(eq(bases.id, base.id)).for("update");
    const existingLinks = await tx
      .select({ baseId: baseModules.baseId, contratoId: contratoModulos.contratoId })
      .from(contratoModulos)
      .innerJoin(baseModules, eq(baseModules.id, contratoModulos.baseModuleId))
      .where(eq(baseModules.baseId, base.id));
    validateBaseAvailability([base.id], existingLinks, contratoId);
    return tx.insert(contratoModulos).values({ contratoId, baseModuleId }).onConflictDoNothing().returning();
  });
  if (inserted.length > 0) await logEvent({ tipo: "modulo_vinculado", descricao: "Módulo vinculado ao contrato.", municipioId: c.municipioId, baseId: base.id, baseModuleId, contratoId });
  await syncPendencias();
  done();
}

export async function desvincularBaseContrato(fd: FormData) {
  const session = await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const baseId = req(fd, "baseId");
  const motivo = req(fd, "motivo");
  if (!CONTRACT_UNLINK_REASONS.includes(motivo as (typeof CONTRACT_UNLINK_REASONS)[number])) {
    throw new Error("Selecione um motivo válido para a desvinculação.");
  }
  const observacoes = str(fd, "observacoes");
  const c = await assertContratoOperacional(contratoId);
  const base = await assertBaseOperacional(baseId);
  if (base.municipioId !== c.municipioId) throw new Error("A base deve pertencer ao cliente deste contrato.");
  await db.transaction(async (tx) => {
    await tx.select({ id: bases.id }).from(bases).where(eq(bases.id, baseId)).for("update");
    const linked = await tx
      .select({ baseModuleId: contratoModulos.baseModuleId })
      .from(contratoModulos)
      .innerJoin(baseModules, eq(baseModules.id, contratoModulos.baseModuleId))
      .where(and(eq(contratoModulos.contratoId, contratoId), eq(baseModules.baseId, baseId)));
    if (linked.length === 0) throw new Error("Esta base não está vinculada ao contrato.");
    await tx.delete(contratoModulos).where(and(
      eq(contratoModulos.contratoId, contratoId),
      inArray(contratoModulos.baseModuleId, linked.map((item) => item.baseModuleId)),
    ));
    await tx.insert(eventos).values({
      tipo: "base_desvinculada_contrato",
      descricao: `Base ${base.nome} desvinculada do contrato ${c.numero}. Motivo: ${motivo}.${observacoes ? ` Observações: ${observacoes}` : ""} ${linked.length} módulo(s) liberado(s).`,
      municipioId: c.municipioId,
      baseId,
      contratoId,
      data: today(),
      usuario: session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna",
    });
  });
  await syncPendencias();
  done();
}

/* ---------------- Documentos ---------------- */

export async function createDocumento(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertDocumentoContextoOperacional(fd, municipioId);
  const contratoId = str(fd, "contratoId");
  const propostaId = str(fd, "propostaId");
  if (contratoId) {
    const contrato = await assertContratoOperacional(contratoId);
    if (contrato.municipioId !== municipioId) throw new Error("O contrato deve pertencer ao cliente selecionado.");
  }
  const arquivo = fileFromFormData(fd);
  if (!arquivo) throw new Error("Selecione um arquivo para anexar.");

  const documentoId = newId();
  const uploaded = await uploadDocumentFile(arquivo, municipioId, documentoId);
  let inserted = false;
  try {
    const row = await db.transaction(async (tx) => {
      if (propostaId) {
        const [proposal] = await tx.select().from(propostas).where(eq(propostas.id, propostaId)).for("update");
        if (!proposal || proposal.excluidaAt) throw new Error("Proposta nao encontrada.");
        if (proposal.situacao === "cancelada") throw new Error("Proposta cancelada nao pode receber alteracoes.");
      }
      const [insertedDocument] = await tx.insert(documentos).values({
        id: documentoId,
        municipioId,
        baseId: str(fd, "baseId"),
        baseModuleId: str(fd, "baseModuleId"),
        propostaId,
        contratoId,
        eventoId: str(fd, "eventoId"),
        tipo: documentTypeForContext(contratoId, str(fd, "tipo")),
        nome: contratoId ? uploaded.originalName : str(fd, "nome") ?? uploaded.originalName,
        referencia: str(fd, "referencia"),
        storageKey: uploaded.key,
        mimeType: uploaded.contentType,
        tamanhoBytes: uploaded.size,
        arquivoNomeOriginal: uploaded.originalName,
        observacoes: str(fd, "observacoes"),
      }).returning();
      return insertedDocument;
    });
    inserted = true;
    await logEvent({ tipo: "documento_anexado", descricao: `Documento anexado: ${row.nome} (${row.tipo}).`, municipioId: row.municipioId, baseId: row.baseId, baseModuleId: row.baseModuleId, contratoId: row.contratoId });
  } finally {
    if (!inserted) await deleteDocumentFile(uploaded.key).catch(() => undefined);
  }
  await syncPendencias();
  done();
}
