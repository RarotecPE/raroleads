"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  baseModules,
  bases,
  documentos,
  eventos,
  municipios,
  propostaBases,
  propostaEspecificidades,
  propostaHistorico,
  propostaModulos,
  propostas,
} from "@/db/schema";
import { requireServerActionPermission } from "@/lib/auth";
import { syncPendencias } from "@/lib/domain";
import { deleteDocumentFile, fileFromFormData, getDocumentFile, MAX_DOCUMENT_SIZE_BYTES, uploadDocumentFile } from "@/lib/document-storage";
import { isValidEmail } from "@/lib/module-enabled-email";
import { assertPropostaTransition, assertUniqueProposalScope, canonicalProposalBaseType, canonicalProposalModuleName, PROPOSTA_ESPECIFICIDADES, PROPOSTA_MODALIDADES, type PropostaStatus } from "@/lib/proposal";
import { sendProposalEmail } from "@/lib/proposal-email";
import { norm } from "@/lib/utils";

const text = (fd: FormData, key: string) => {
  const value = fd.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};
const required = (fd: FormData, key: string) => {
  const value = text(fd, key);
  if (!value) throw new Error(`Campo obrigatório ausente: ${key}`);
  return value;
};
const today = () => new Date().toISOString().slice(0, 10);
const userName = (session: Awaited<ReturnType<typeof requireServerActionPermission>>) =>
  session.user.nome?.trim() || session.user.email?.trim() || "Equipe Interna";

type ProposalItemInput = {
  baseId?: string | null;
  nome: string;
  tipo?: string | null;
  modulos: { baseModuleId?: string | null; nome: string }[];
};

function parseItems(raw: string): ProposalItemInput[] {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("As bases e módulos informados são inválidos."); }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100) throw new Error("Informe ao menos uma base válida.");
  const items = parsed.map((value) => {
    if (!value || typeof value !== "object") throw new Error("Base inválida na proposta.");
    const item = value as Record<string, unknown>;
    const nome = typeof item.nome === "string" ? item.nome.trim() : "";
    const rawModules = Array.isArray(item.modulos) ? item.modulos : [];
    const modulos = rawModules.map((module) => {
      if (!module || typeof module !== "object") throw new Error("Módulo inválido na proposta.");
      const candidate = module as Record<string, unknown>;
      const moduleName = typeof candidate.nome === "string" ? candidate.nome.trim() : "";
      if (!moduleName) throw new Error("Informe o nome de cada módulo.");
      return { baseModuleId: typeof candidate.baseModuleId === "string" ? candidate.baseModuleId : null, nome: moduleName };
    });
    if (!nome || modulos.length === 0) throw new Error("Cada base deve possuir ao menos um módulo.");
    return {
      baseId: typeof item.baseId === "string" ? item.baseId : null,
      nome,
      tipo: typeof item.tipo === "string" ? item.tipo.trim() || null : null,
      modulos,
    };
  });
  assertUniqueProposalScope(items);
  return items;
}

export async function createProposta(fd: FormData) {
  const session = await requireServerActionPermission();
  const tipo = required(fd, "tipo");
  if (!PROPOSTA_MODALIDADES.includes(tipo as (typeof PROPOSTA_MODALIDADES)[number])) throw new Error("Modalidade de proposta inválida.");

  const municipioId = text(fd, "municipioId");
  const cliente = municipioId ? (await db.select().from(municipios).where(eq(municipios.id, municipioId)))[0] : null;
  if (municipioId && !cliente) throw new Error("Cliente não encontrado.");
  if (cliente?.situacao === "cliente_encerrado") throw new Error("Cliente encerrado não pode receber uma nova proposta.");

  let clienteNomeSnapshot = cliente?.clienteNome ?? required(fd, "clienteNomeSnapshot");
  let municipioNome = cliente?.municipio ?? required(fd, "municipioNome");
  let uf = cliente?.uf ?? required(fd, "uf").toUpperCase().slice(0, 2);
  let codigoIbge = cliente?.codigoIbge ?? text(fd, "codigoIbge");
  let atividadeConjunta: boolean | null = null;
  let items: ProposalItemInput[];
  let especificidades: string[] = [];

  if (tipo === "consultoria") {
    if (!cliente) throw new Error("A consultoria exige um cliente cadastrado.");
    const baseModuleId = required(fd, "baseModuleId");
    const [module] = await db.select().from(baseModules).where(eq(baseModules.id, baseModuleId));
    const [base] = module ? await db.select().from(bases).where(eq(bases.id, module.baseId)) : [];
    if (!module || !base || base.municipioId !== cliente.id) throw new Error("Selecione uma base e um módulo válidos do cliente.");
    especificidades = [...new Set(fd.getAll("especificidades").filter((value): value is string => typeof value === "string"))];
    if (!especificidades.length || especificidades.some((value) => !PROPOSTA_ESPECIFICIDADES.includes(value as (typeof PROPOSTA_ESPECIFICIDADES)[number]))) {
      throw new Error("Selecione ao menos uma especificidade técnica válida.");
    }
    const joint = required(fd, "atividadeConjunta");
    if (joint !== "sim" && joint !== "nao") throw new Error("Informe se as atividades serão realizadas em conjunto.");
    atividadeConjunta = joint === "sim";
    items = [{ baseId: base.id, nome: base.nome, tipo: base.tipo, modulos: [{ baseModuleId: module.id, nome: module.nome }] }];
  } else {
    items = parseItems(required(fd, "itens"));
    items = items.map((item) => {
      const tipoBase = canonicalProposalBaseType(item.tipo);
      if (!tipoBase) throw new Error(`Selecione um tipo válido para a base ${item.nome}.`);
      return {
        ...item,
        tipo: tipoBase,
        modulos: item.modulos.map((module) => {
          const nome = canonicalProposalModuleName(module.nome);
          if (!nome) throw new Error(`O módulo ${module.nome} não pertence ao catálogo disponível.`);
          return { ...module, nome };
        }),
      };
    });
    if (cliente) {
      const baseIds = items.flatMap((item) => item.baseId ? [item.baseId] : []);
      const registeredBases = baseIds.length ? await db.select().from(bases).where(inArray(bases.id, baseIds)) : [];
      if (registeredBases.length !== baseIds.length || registeredBases.some((base) => base.municipioId !== cliente.id)) {
        throw new Error("Selecione apenas bases válidas do cliente.");
      }
      const moduleIds = [...new Set(items.flatMap((item) => item.modulos.flatMap((module) => module.baseModuleId ? [module.baseModuleId] : [])))];
      const registeredModules = moduleIds.length ? await db.select().from(baseModules).where(inArray(baseModules.id, moduleIds)) : [];
      if (registeredModules.length !== moduleIds.length) throw new Error("Selecione apenas módulos válidos.");
      const baseById = new Map(registeredBases.map((base) => [base.id, base]));
      const moduleById = new Map(registeredModules.map((proposalModule) => [proposalModule.id, proposalModule]));
      const allClientBases = await db.select().from(bases).where(eq(bases.municipioId, cliente.id));
      const allClientModules = allClientBases.length
        ? await db.select().from(baseModules).where(inArray(baseModules.baseId, allClientBases.map((base) => base.id)))
        : [];
      items = items.map((item) => {
        if (!item.baseId) {
          if (allClientBases.some((base) => norm(base.nome.trim()) === norm(item.nome.trim()))) throw new Error(`A base ${item.nome} já está cadastrada para este cliente.`);
          if (item.modulos.some((module) => module.baseModuleId)) throw new Error("Uma nova base não pode referenciar módulos de outra base.");
          return item;
        }
        const base = baseById.get(item.baseId);
        if (!base) throw new Error("Base da proposta não encontrada.");
        return {
          baseId: base.id,
          nome: base.nome,
          tipo: base.tipo,
          modulos: item.modulos.map((inputModule) => {
            const proposalModule = inputModule.baseModuleId
              ? moduleById.get(inputModule.baseModuleId)
              : allClientModules.find((module) => module.baseId === base.id && norm(module.nome.trim()) === norm(inputModule.nome.trim()));
            if (!proposalModule) return { baseModuleId: null, nome: inputModule.nome };
            if (!proposalModule || proposalModule.baseId !== base.id) throw new Error("O módulo não pertence à base selecionada.");
            return { baseModuleId: proposalModule.id, nome: proposalModule.nome };
          }),
        };
      });
    } else if (items.some((item) => item.baseId || item.modulos.some((module) => module.baseModuleId))) {
      throw new Error("Dados avulsos não podem referenciar cadastros de outro cliente.");
    }
  }

  const proposalId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(propostas).values({
      id: proposalId,
      municipioId,
      tipo,
      data: today(),
      situacao: "solicitada",
      clienteNomeSnapshot,
      municipioNome,
      uf,
      codigoIbge,
      atividadeConjunta,
      observacoes: text(fd, "observacoes"),
    });
    for (const item of items) {
      const proposalBaseId = crypto.randomUUID();
      await tx.insert(propostaBases).values({ id: proposalBaseId, propostaId: proposalId, baseId: item.baseId, nome: item.nome, tipo: item.tipo });
      await tx.insert(propostaModulos).values(item.modulos.map((module) => ({
        propostaBaseId: proposalBaseId,
        baseModuleId: module.baseModuleId,
        nome: module.nome,
      })));
    }
    if (especificidades.length) await tx.insert(propostaEspecificidades).values(especificidades.map((especificidade) => ({ propostaId: proposalId, especificidade })));
    await tx.insert(propostaHistorico).values({
      propostaId: proposalId, acao: "solicitada", statusNovo: "solicitada",
      descricao: `Proposta de ${tipo === "consultoria" ? "consultoria" : "implantação do sistema"} solicitada.`, usuario: userName(session),
    });
  });
  revalidatePath("/propostas");
  redirect(`/propostas/${proposalId}`);
}

async function proposalById(id: string) {
  const [proposal] = await db.select().from(propostas).where(eq(propostas.id, id));
  if (!proposal) throw new Error("Proposta não encontrada.");
  return proposal;
}

export async function uploadPropostaDocumento(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = required(fd, "id");
  const proposal = await proposalById(id);
  if (proposal.situacao !== "solicitada" && proposal.situacao !== "em_retificacao") throw new Error("A proposta não está aguardando um documento.");
  const file = fileFromFormData(fd);
  if (!file) throw new Error("Selecione o documento da proposta.");
  const existing = await db.select().from(documentos).where(eq(documentos.propostaId, id)).orderBy(desc(documentos.propostaVersao));
  const version = (existing[0]?.propostaVersao ?? 0) + 1;
  const documentId = crypto.randomUUID();
  let storageKey: string | null = null;
  try {
    const uploaded = await uploadDocumentFile(file, `proposta-${id}`, documentId);
    storageKey = uploaded.key;
    await db.transaction(async (tx) => {
      await tx.insert(documentos).values({
        id: documentId, municipioId: proposal.municipioId, propostaId: id, tipo: "Proposta",
        nome: text(fd, "nome") ?? uploaded.originalName, storageKey: uploaded.key,
        mimeType: uploaded.contentType, tamanhoBytes: uploaded.size, arquivoNomeOriginal: uploaded.originalName,
        propostaVersao: version,
      });
      await tx.update(propostas).set({ situacao: "gerada", geradaAt: new Date() }).where(eq(propostas.id, id));
      await tx.insert(propostaHistorico).values({
        propostaId: id, documentoId: documentId, acao: "documento_gerado", statusAnterior: proposal.situacao, statusNovo: "gerada",
        descricao: `Versão ${version} do documento anexada.`, usuario: userName(session),
      });
    });
  } catch (error) {
    if (storageKey) await deleteDocumentFile(storageKey).catch(() => undefined);
    await db.insert(propostaHistorico).values({
      propostaId: id, acao: "falha_documento", statusAnterior: proposal.situacao, statusNovo: proposal.situacao,
      descricao: `Falha ao anexar documento: ${error instanceof Error ? error.message : "erro desconhecido"}.`, usuario: userName(session),
    }).catch(() => undefined);
    throw error;
  }
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
}

export async function enviarProposta(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = required(fd, "id");
  const recipientName = required(fd, "destinatarioNome");
  const recipientEmail = required(fd, "destinatarioEmail").toLowerCase();
  if (!isValidEmail(recipientEmail)) throw new Error("Informe um e-mail válido.");
  const proposal = await proposalById(id);
  assertPropostaTransition(proposal.situacao, "enviada");
  const [document] = await db.select().from(documentos).where(eq(documentos.propostaId, id)).orderBy(desc(documentos.propostaVersao), desc(documentos.createdAt)).limit(1);
  if (!document?.storageKey || !document.propostaVersao) throw new Error("A proposta não possui documento gerado.");
  if ((document.tamanhoBytes ?? 0) > MAX_DOCUMENT_SIZE_BYTES) throw new Error("O documento excede o limite de 20 MB.");
  try {
    const object = await getDocumentFile(document.storageKey);
    if (!object.Body) throw new Error("Arquivo da proposta não encontrado.");
    const bytes = await object.Body.transformToByteArray();
    if (bytes.byteLength > MAX_DOCUMENT_SIZE_BYTES) throw new Error("O documento excede o limite de 20 MB.");
    await sendProposalEmail({
      proposalId: id, modality: proposal.tipo, customerName: proposal.clienteNomeSnapshot,
      recipientName, recipientEmail, version: document.propostaVersao, municipalityId: proposal.municipioId,
      attachment: {
        filename: document.arquivoNomeOriginal ?? document.nome,
        content_type: document.mimeType ?? object.ContentType ?? "application/octet-stream",
        content_base64: Buffer.from(bytes).toString("base64"),
      },
    });
  } catch (error) {
    await db.insert(propostaHistorico).values({
      propostaId: id, documentoId: document.id, acao: "envio_falhou", statusAnterior: "gerada", statusNovo: "gerada",
      descricao: `Falha ao enviar a proposta: ${error instanceof Error ? error.message : "erro desconhecido"}.`, usuario: userName(session), destinatarioEmail: recipientEmail,
    });
    revalidatePath(`/propostas/${id}`);
    throw error;
  }
  await db.transaction(async (tx) => {
    await tx.update(propostas).set({ situacao: "enviada", enviadaAt: new Date() }).where(and(eq(propostas.id, id), eq(propostas.situacao, "gerada")));
    await tx.insert(propostaHistorico).values({
      propostaId: id, documentoId: document.id, acao: "enviada", statusAnterior: "gerada", statusNovo: "enviada",
      descricao: `Proposta enviada para ${recipientName}.`, usuario: userName(session), destinatarioEmail: recipientEmail,
    });
  });
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
}

async function materializeAcceptedProposal(id: string, usuario: string) {
  return db.transaction(async (tx) => {
    const [proposal] = await tx.select().from(propostas).where(eq(propostas.id, id)).for("update");
    if (!proposal) throw new Error("Proposta não encontrada.");
    if (proposal.situacao !== "aceita") throw new Error("Somente propostas aceitas podem gerar cadastros.");
    if (!proposal.municipioId) throw new Error("A proposta não está vinculada a um cliente cadastrado.");

    const proposalBaseRows = await tx.select().from(propostaBases).where(eq(propostaBases.propostaId, id)).orderBy(propostaBases.id).for("update");
    const proposalModuleRows = proposalBaseRows.length
      ? await tx.select().from(propostaModulos).where(inArray(propostaModulos.propostaBaseId, proposalBaseRows.map((base) => base.id))).orderBy(propostaModulos.id).for("update")
      : [];
    const hadPendingItems = proposalBaseRows.some((base) => !base.baseId) || proposalModuleRows.some((module) => !module.baseModuleId);
    if (!hadPendingItems) return { changed: false, createdBases: 0, createdModules: 0, reusedBases: 0, reusedModules: 0 };

    const clientBases = await tx.select().from(bases).where(eq(bases.municipioId, proposal.municipioId)).orderBy(bases.id).for("update");
    const clientModules = clientBases.length
      ? await tx.select().from(baseModules).where(inArray(baseModules.baseId, clientBases.map((base) => base.id))).orderBy(baseModules.id).for("update")
      : [];
    let createdBases = 0;
    let createdModules = 0;
    let reusedBases = 0;
    let reusedModules = 0;

    for (const proposalBase of proposalBaseRows) {
      let targetBase = proposalBase.baseId ? clientBases.find((base) => base.id === proposalBase.baseId) : undefined;
      if (proposalBase.baseId && !targetBase) throw new Error(`A base vinculada a ${proposalBase.nome} não pertence mais ao cliente.`);
      if (!targetBase) {
        targetBase = clientBases.find((base) => norm(base.nome.trim()) === norm(proposalBase.nome.trim()));
        if (targetBase) reusedBases += 1;
      }
      if (!targetBase) {
        [targetBase] = await tx.insert(bases).values({
          municipioId: proposal.municipioId,
          nome: proposalBase.nome,
          tipo: proposalBase.tipo ?? "Outros",
          situacao: "ativa",
        }).returning();
        clientBases.push(targetBase);
        createdBases += 1;
        await tx.insert(eventos).values({
          tipo: "base_criada",
          descricao: `Base ${targetBase.nome} criada a partir da proposta aceita ${proposal.id}.`,
          municipioId: proposal.municipioId,
          baseId: targetBase.id,
          data: today(),
          usuario,
        });
      }
      if (proposalBase.baseId !== targetBase.id) await tx.update(propostaBases).set({ baseId: targetBase.id }).where(eq(propostaBases.id, proposalBase.id));

      for (const proposalModule of proposalModuleRows.filter((module) => module.propostaBaseId === proposalBase.id)) {
        let targetModule = proposalModule.baseModuleId ? clientModules.find((module) => module.id === proposalModule.baseModuleId) : undefined;
        if (targetModule && targetModule.baseId !== targetBase.id) targetModule = undefined;
        if (!targetModule) {
          targetModule = clientModules.find((module) => module.baseId === targetBase.id && norm(module.nome.trim()) === norm(proposalModule.nome.trim()));
          if (targetModule) reusedModules += 1;
        }
        if (!targetModule) {
          [targetModule] = await tx.insert(baseModules).values({ baseId: targetBase.id, nome: proposalModule.nome }).returning();
          clientModules.push(targetModule);
          createdModules += 1;
          await tx.insert(eventos).values({
            tipo: "modulo_criado",
            descricao: `Módulo ${targetModule.nome} criado a partir da proposta aceita ${proposal.id}.`,
            municipioId: proposal.municipioId,
            baseId: targetBase.id,
            baseModuleId: targetModule.id,
            data: today(),
            usuario,
          });
        }
        if (proposalModule.baseModuleId !== targetModule.id) await tx.update(propostaModulos).set({ baseModuleId: targetModule.id }).where(eq(propostaModulos.id, proposalModule.id));
      }
    }

    await tx.insert(propostaHistorico).values({
      propostaId: id,
      acao: "cadastros_criados",
      statusAnterior: "aceita",
      statusNovo: "aceita",
      descricao: `${createdBases} base(s) e ${createdModules} módulo(s) criados; ${reusedBases} base(s) e ${reusedModules} módulo(s) existentes reutilizados.`,
      usuario,
    });
    return { changed: true, createdBases, createdModules, reusedBases, reusedModules };
  });
}

async function recordMaterializationFailure(id: string, usuario: string, error: unknown) {
  await db.insert(propostaHistorico).values({
    propostaId: id,
    acao: "cadastros_criacao_falhou",
    statusAnterior: "aceita",
    statusNovo: "aceita",
    descricao: `Falha ao criar bases e módulos: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
    usuario,
  }).catch(() => undefined);
}

export async function materializarCadastrosProposta(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = required(fd, "id");
  try {
    const result = await materializeAcceptedProposal(id, userName(session));
    if (result.changed) await syncPendencias();
  } catch (error) {
    await recordMaterializationFailure(id, userName(session), error);
    revalidatePath(`/propostas/${id}`);
    throw error;
  }
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/clientes", "layout");
}

export async function decidirProposta(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = required(fd, "id");
  const status = required(fd, "status") as PropostaStatus;
  if (!(["aceita", "recusada", "em_retificacao"] as string[]).includes(status)) throw new Error("Decisão inválida.");
  const proposal = await proposalById(id);
  assertPropostaTransition(proposal.situacao, status);
  const motivo = text(fd, "motivo");
  if ((status === "recusada" || status === "em_retificacao") && !motivo) throw new Error("Informe o motivo da decisão.");
  await db.transaction(async (tx) => {
    await tx.update(propostas).set({ situacao: status, decisaoAt: status === "em_retificacao" ? null : new Date() }).where(eq(propostas.id, id));
    await tx.insert(propostaHistorico).values({
      propostaId: id, acao: status, statusAnterior: proposal.situacao, statusNovo: status,
      descricao: motivo ?? "Proposta aceita.", usuario: userName(session),
    });
  });
  if (status === "aceita" && proposal.municipioId && text(fd, "criarCadastros") === "sim") {
    try {
      const result = await materializeAcceptedProposal(id, userName(session));
      if (result.changed) await syncPendencias();
    } catch (error) {
      await recordMaterializationFailure(id, userName(session), error);
    }
  }
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  if (status === "aceita") revalidatePath("/clientes", "layout");
}
