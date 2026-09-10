"use server";

import { and, eq, inArray } from "drizzle-orm";
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
  moduloResponsaveis,
  pendencias,
  propostas,
} from "@/db/schema";
import { requireServerActionPermission } from "@/lib/auth";
import { cnpjDigits } from "@/lib/cnpj";
import { ADITIVO_TIPO_ALTERACAO_PRAZO, normalizeContratoSituacao, optLabel } from "@/lib/constants";
import { deleteDocumentFile, fileFromFormData, uploadDocumentFile } from "@/lib/document-storage";
import { logEvent, syncPendencias } from "@/lib/domain";
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

async function assertClienteOperacional(municipioId: string | null | undefined) {
  if (!municipioId) return;
  const [cliente] = await db.select().from(municipios).where(eq(municipios.id, municipioId));
  if (cliente?.situacao === CLIENTE_ENCERRADO) {
    throw new Error("Cliente encerrado. Reabra o cadastro do cliente antes de realizar novas alterações operacionais.");
  }
}

async function assertBaseOperacional(baseId: string) {
  const [base] = await db.select().from(bases).where(eq(bases.id, baseId));
  if (!base) {
    throw new Error("Base nao encontrada.");
  }
  await assertClienteOperacional(base?.municipioId);
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

async function hasModuloNaBase(baseId: string, nome: string) {
  const modulos = await db.select().from(baseModules).where(eq(baseModules.baseId, baseId));
  const normalizedNome = norm(nome);
  return modulos.some((modulo) => norm(modulo.nome) === normalizedNome);
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

async function assertPendenciaOperacional(pendenciaId: string) {
  const [pendencia] = await db.select().from(pendencias).where(eq(pendencias.id, pendenciaId));
  if (!pendencia) {
    throw new Error("Pendencia nao encontrada.");
  }
  await assertClienteOperacional(pendencia.municipioId);
  return pendencia;
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
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertClienteOperacional(municipioId);
  const nome = req(fd, "nome");
  const [row] = await db
    .insert(bases)
    .values({
      municipioId,
      nome,
      tipo: str(fd, "tipo") ?? "outros",
      cnpj: cnpjValue(fd, "cnpj"),
      observacoes: str(fd, "observacoes"),
    })
    .returning();

  await logEvent({ tipo: "base_criada", descricao: `Base ${nome} criada.`, municipioId, baseId: row.id });
  await syncPendencias();
  done();
}

export async function updateBase(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const base = await assertBaseOperacional(id);
  const municipioId = base.municipioId;
  const nome = req(fd, "nome");
  await db
    .update(bases)
    .set({
      nome,
      tipo: str(fd, "tipo") ?? "outros",
      cnpj: cnpjValue(fd, "cnpj"),
      observacoes: str(fd, "observacoes"),
    })
    .where(eq(bases.id, id));

  await logEvent({ tipo: "base_atualizada", descricao: `Base ${nome} atualizada.`, municipioId, baseId: id });
  await syncPendencias();
  done();
}

/* ---------------- Módulos ---------------- */

export async function createModulo(fd: FormData) {
  await requireServerActionPermission();
  const baseId = req(fd, "baseId");
  await assertBaseOperacional(baseId);
  const municipioId = str(fd, "municipioId");
  const nome = req(fd, "nome");
  const responsavelNome = str(fd, "responsavelNome");
  const responsavelEmail = str(fd, "responsavelEmail");
  const responsavelCelular = phoneDigits(fd, "responsavelCelular");
  const deveCriarResponsavel = !!responsavelNome || !!responsavelEmail || !!responsavelCelular;

  if (await hasModuloNaBase(baseId, nome)) {
    throw new Error(MODULO_DUPLICADO_MESSAGE);
  }

  if (deveCriarResponsavel && !responsavelNome) {
    throw new Error("Informe o nome do responsavel pelo modulo, ou deixe todos os campos de responsavel vazios.");
  }

  const row = await db.transaction(async (tx) => {
    const [modulo] = await tx
      .insert(baseModules)
      .values({ baseId, nome, observacoes: str(fd, "observacoes") })
      .returning();

    if (deveCriarResponsavel && responsavelNome && municipioId) {
      await tx.insert(moduloResponsaveis).values({
        municipioId,
        baseModuleId: modulo.id,
        nome: responsavelNome,
        email: responsavelEmail,
        celular: responsavelCelular,
        avisoHabilitacaoEmail: str(fd, "avisoHabilitacaoEmail") === "on",
      });
    }

    return modulo;
  });
  await logEvent({ tipo: "modulo_criado", descricao: `Módulo ${nome} criado na base.`, municipioId, baseId, baseModuleId: row.id });
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
    avisoHabilitacaoEmail: str(fd, "avisoHabilitacaoEmail") === "on",
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
      avisoHabilitacaoEmail: str(fd, "avisoHabilitacaoEmail") === "on",
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
  await assertModuloOperacional(id);
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

const today = () => new Date().toISOString().slice(0, 10);

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

/* ---------------- Propostas ---------------- */

export async function createProposta(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertClienteOperacional(municipioId);
  const arquivo = fileFromFormData(fd);
  let uploadedKey: string | null = null;
  const row = await db.transaction(async (tx) => {
    const [proposta] = await tx
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

    if (arquivo) {
      const documentoId = newId();
      const uploaded = await uploadDocumentFile(arquivo, municipioId, documentoId);
      uploadedKey = uploaded.key;
      await tx.insert(documentos).values({
        id: documentoId,
        municipioId,
        propostaId: proposta.id,
        tipo: str(fd, "documentoTipo") ?? "proposta",
        nome: str(fd, "documentoNome") ?? uploaded.originalName,
        storageKey: uploaded.key,
        mimeType: uploaded.contentType,
        tamanhoBytes: uploaded.size,
        arquivoNomeOriginal: uploaded.originalName,
      });
    }

    return proposta;
  }).catch(async (error) => {
    if (uploadedKey) await deleteDocumentFile(uploadedKey).catch(() => undefined);
    throw error;
  });
  await logEvent({ tipo: "proposta_criada", descricao: `Proposta criada (${row.tipo}).`, municipioId, data: row.data ?? today() });
  await syncPendencias();
  done();
}

export async function setPropostaSituacao(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const situacao = req(fd, "situacao");
  const p = await assertPropostaOperacional(id);
  await db.update(propostas).set({ situacao }).where(eq(propostas.id, id));
  await logEvent({ tipo: "proposta_situacao", descricao: `Proposta marcada como ${situacao}.`, municipioId: p?.municipioId ?? null });
  await syncPendencias();
  done();
}

/* ---------------- Contratos ---------------- */

export async function createContrato(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertClienteOperacional(municipioId);
  const basesDoCliente = await db.select({ id: bases.id }).from(bases).where(eq(bases.municipioId, municipioId));
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
  if (baseModuleIds.length > 0) {
    const modulosSelecionados = await db
      .select({ id: baseModules.id, baseId: baseModules.baseId })
      .from(baseModules)
      .where(inArray(baseModules.id, baseModuleIds));
    const basesValidas = new Set(basesDoCliente.map((base) => base.id));
    if (
      modulosSelecionados.length !== baseModuleIds.length ||
      modulosSelecionados.some((modulo) => !basesValidas.has(modulo.baseId))
    ) {
      throw new Error("Selecione apenas bases e módulos cadastrados para este cliente.");
    }
  }

  const arquivo = fileFromFormData(fd);
  if (!arquivo) throw new Error("Selecione um arquivo para anexar ao contrato.");
  let uploadedKey: string | null = null;
  const row = await db.transaction(async (tx) => {
    const [contrato] = await tx
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
        situacao: normalizeContratoSituacao(str(fd, "situacao")),
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
        tipo: str(fd, "documentoTipo") ?? "contrato",
        nome: str(fd, "documentoNome") ?? uploaded.originalName,
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

export async function setContratoSituacao(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const situacao = normalizeContratoSituacao(req(fd, "situacao"));
  const c = await assertContratoOperacional(id);
  await db.update(contratos).set({ situacao }).where(eq(contratos.id, id));
  await logEvent({ tipo: "contrato_situacao", descricao: `Contrato ${c?.numero ?? id} marcado como ${situacao}.`, municipioId: c?.municipioId ?? null, contratoId: id });
  await syncPendencias();
  done();
}

export async function vincularModulo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const baseModuleId = req(fd, "baseModuleId");
  const c = await assertContratoOperacional(contratoId);
  await assertModuloOperacional(baseModuleId);
  await db.insert(contratoModulos).values({ contratoId, baseModuleId }).onConflictDoNothing();
  await logEvent({ tipo: "modulo_vinculado", descricao: "Módulo vinculado ao contrato.", municipioId: c?.municipioId ?? null, baseModuleId, contratoId });
  await syncPendencias();
  done();
}

export async function desvincularModulo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const baseModuleId = req(fd, "baseModuleId");
  const c = await assertContratoOperacional(contratoId);
  await assertModuloOperacional(baseModuleId);
  await db
    .delete(contratoModulos)
    .where(and(eq(contratoModulos.contratoId, contratoId), eq(contratoModulos.baseModuleId, baseModuleId)));
  await logEvent({ tipo: "modulo_desvinculado", descricao: "Módulo desvinculado do contrato (histórico do vínculo preservado no evento).", municipioId: c?.municipioId ?? null, baseModuleId, contratoId });
  await syncPendencias();
  done();
}

export async function createAditivo(fd: FormData) {
  await requireServerActionPermission();
  const contratoId = req(fd, "contratoId");
  const c = await assertContratoOperacional(contratoId);
  const tipo = str(fd, "tipo") ?? "alteracao_contratual";
  const novaDataFim = tipo === ADITIVO_TIPO_ALTERACAO_PRAZO ? req(fd, "novaDataFim") : null;
  const arquivo = fileFromFormData(fd);
  if (!arquivo) throw new Error("Selecione um arquivo para anexar ao aditivo.");
  let uploadedKey: string | null = null;
  const row = await db.transaction(async (tx) => {
    const [aditivo] = await tx
      .insert(aditivos)
      .values({
        contratoId,
        tipo,
        data: str(fd, "data") ?? today(),
        descricao: req(fd, "descricao"),
        novaDataFim,
      })
      .returning();

    if (novaDataFim) {
      await tx.update(contratos).set({ dataFim: novaDataFim }).where(eq(contratos.id, contratoId));
    }

    if (arquivo) {
      const documentoId = newId();
      const uploaded = await uploadDocumentFile(arquivo, c.municipioId, documentoId);
      uploadedKey = uploaded.key;
      await tx.insert(documentos).values({
        id: documentoId,
        municipioId: c.municipioId,
        contratoId,
        aditivoId: aditivo.id,
        tipo: str(fd, "documentoTipo") ?? "aditivo",
        nome: str(fd, "documentoNome") ?? uploaded.originalName,
        storageKey: uploaded.key,
        mimeType: uploaded.contentType,
        tamanhoBytes: uploaded.size,
        arquivoNomeOriginal: uploaded.originalName,
      });
    }

    return aditivo;
  }).catch(async (error) => {
    if (uploadedKey) await deleteDocumentFile(uploadedKey).catch(() => undefined);
    throw error;
  });
  await logEvent({ tipo: "aditivo_criado", descricao: `Aditivo (${row.tipo}): ${row.descricao}`, municipioId: c?.municipioId ?? null, contratoId, data: row.data ?? today() });
  await syncPendencias();
  done();
}

/* ---------------- Documentos ---------------- */

export async function createDocumento(fd: FormData) {
  await requireServerActionPermission();
  const municipioId = req(fd, "municipioId");
  await assertDocumentoContextoOperacional(fd, municipioId);
  const arquivo = fileFromFormData(fd);
  if (!arquivo) throw new Error("Selecione um arquivo para anexar.");

  const documentoId = newId();
  const uploaded = await uploadDocumentFile(arquivo, municipioId, documentoId);
  let inserted = false;
  try {
    const [row] = await db
      .insert(documentos)
      .values({
        id: documentoId,
        municipioId,
        baseId: str(fd, "baseId"),
        baseModuleId: str(fd, "baseModuleId"),
        propostaId: str(fd, "propostaId"),
        contratoId: str(fd, "contratoId"),
        eventoId: str(fd, "eventoId"),
        tipo: str(fd, "tipo") ?? "outros",
        nome: str(fd, "nome") ?? uploaded.originalName,
        referencia: str(fd, "referencia"),
        storageKey: uploaded.key,
        mimeType: uploaded.contentType,
        tamanhoBytes: uploaded.size,
        arquivoNomeOriginal: uploaded.originalName,
        observacoes: str(fd, "observacoes"),
      })
      .returning();
    inserted = true;
    await logEvent({ tipo: "documento_anexado", descricao: `Documento anexado: ${row.nome} (${row.tipo}).`, municipioId: row.municipioId, baseId: row.baseId, baseModuleId: row.baseModuleId, contratoId: row.contratoId });
  } finally {
    if (!inserted) await deleteDocumentFile(uploaded.key).catch(() => undefined);
  }
  await syncPendencias();
  done();
}

/* ---------------- Pendências ---------------- */

export async function resolverPendencia(fd: FormData) {
  await requireServerActionPermission();
  const id = req(fd, "id");
  const p = await assertPendenciaOperacional(id);
  await db.update(pendencias).set({ situacao: "resolvida", resolvedAt: new Date() }).where(eq(pendencias.id, id));
  await logEvent({ tipo: "pendencia_resolvida", descricao: `Pendência resolvida manualmente: ${p?.descricao ?? id}`, municipioId: p?.municipioId ?? null, baseId: p?.baseId ?? null, baseModuleId: p?.baseModuleId ?? null, contratoId: p?.contratoId ?? null });
  done();
}

export async function createPendencia(fd: FormData) {
  await requireServerActionPermission();
  await assertClienteOperacional(req(fd, "municipioId"));
  await db.insert(pendencias).values({
    tipo: "manual",
    descricao: req(fd, "descricao"),
    origem: "manual",
    municipioId: str(fd, "municipioId"),
  });
  done();
}
