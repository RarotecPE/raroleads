"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
import { assertPropostaTransition, assertProposalIdentityUnchanged, assertUniqueProposalScope, canonicalProposalBaseType, canonicalProposalModuleName, PROPOSTA_ESPECIFICIDADES, PROPOSTA_MODALIDADES, selectProposalClientCandidate, type ProposalImmutableIdentity, type PropostaStatus } from "@/lib/proposal";
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

type ValidatedProposalInput = {
  tipo: (typeof PROPOSTA_MODALIDADES)[number];
  municipioId: string | null;
  clienteNomeSnapshot: string;
  municipioNome: string;
  uf: string;
  codigoIbge: string | null;
  atividadeConjunta: boolean | null;
  items: ProposalItemInput[];
  especificidades: string[];
  observacoes: string | null;
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

async function validateProposalForm(fd: FormData, lockedIdentity?: ProposalImmutableIdentity): Promise<ValidatedProposalInput> {
  const submittedTipo = required(fd, "tipo");
  if (!PROPOSTA_MODALIDADES.includes(submittedTipo as (typeof PROPOSTA_MODALIDADES)[number])) throw new Error("Modalidade de proposta inválida.");
  if (lockedIdentity) {
    assertProposalIdentityUnchanged(lockedIdentity, {
      tipo: submittedTipo,
      municipioId: text(fd, "municipioId"),
      clienteNomeSnapshot: required(fd, "clienteNomeSnapshot"),
      municipioNome: required(fd, "municipioNome"),
      uf: required(fd, "uf"),
      codigoIbge: text(fd, "codigoIbge"),
    });
  }
  const tipo = lockedIdentity?.tipo ?? submittedTipo;
  const municipioId = lockedIdentity?.municipioId ?? text(fd, "municipioId");
  const cliente = municipioId ? (await db.select().from(municipios).where(eq(municipios.id, municipioId)))[0] : null;
  if (municipioId && !cliente) throw new Error("Cliente não encontrado.");
  if (cliente?.situacao === "cliente_encerrado") throw new Error("Cliente encerrado não pode receber uma nova proposta.");

  const clienteNomeSnapshot = lockedIdentity?.clienteNomeSnapshot ?? cliente?.clienteNome ?? required(fd, "clienteNomeSnapshot");
  const municipioNome = lockedIdentity?.municipioNome ?? cliente?.municipio ?? required(fd, "municipioNome");
  const uf = lockedIdentity?.uf ?? cliente?.uf ?? required(fd, "uf").toUpperCase().slice(0, 2);
  const codigoIbge = lockedIdentity ? lockedIdentity.codigoIbge : cliente?.codigoIbge ?? text(fd, "codigoIbge");
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

  return {
    tipo: tipo as ValidatedProposalInput["tipo"],
    municipioId,
    clienteNomeSnapshot,
    municipioNome,
    uf,
    codigoIbge,
    atividadeConjunta,
    items,
    especificidades,
    observacoes: text(fd, "observacoes"),
  };
}

async function insertProposalScope(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], proposalId: string, input: ValidatedProposalInput) {
  for (const item of input.items) {
    const proposalBaseId = crypto.randomUUID();
    await tx.insert(propostaBases).values({ id: proposalBaseId, propostaId: proposalId, baseId: item.baseId, nome: item.nome, tipo: item.tipo });
    await tx.insert(propostaModulos).values(item.modulos.map((module) => ({
      propostaBaseId: proposalBaseId,
      baseModuleId: module.baseModuleId,
      nome: module.nome,
    })));
  }
  if (input.especificidades.length) await tx.insert(propostaEspecificidades).values(input.especificidades.map((especificidade) => ({ propostaId: proposalId, especificidade })));
}

export async function createProposta(fd: FormData) {
  const session = await requireServerActionPermission();
  const input = await validateProposalForm(fd);

  const proposalId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(propostas).values({
      id: proposalId,
      municipioId: input.municipioId,
      tipo: input.tipo,
      data: today(),
      situacao: "solicitada",
      clienteNomeSnapshot: input.clienteNomeSnapshot,
      municipioNome: input.municipioNome,
      uf: input.uf,
      codigoIbge: input.codigoIbge,
      atividadeConjunta: input.atividadeConjunta,
      observacoes: input.observacoes,
    });
    await insertProposalScope(tx, proposalId, input);
    await tx.insert(propostaHistorico).values({
      propostaId: proposalId, acao: "solicitada", statusNovo: "solicitada",
      descricao: `Proposta de ${input.tipo === "consultoria" ? "consultoria" : "implantação do sistema"} solicitada.`, usuario: userName(session),
    });
  });
  revalidatePath("/propostas");
  redirect(`/propostas/${proposalId}`);
}

export async function atualizarProposta(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = required(fd, "id");
  const original = await proposalById(id);
  if (original.situacao !== "solicitada" && original.situacao !== "em_retificacao") throw new Error("A proposta não pode ser editada no status atual.");
  const input = await validateProposalForm(fd, original);
  await db.transaction(async (tx) => {
    const [proposal] = await tx.select().from(propostas).where(eq(propostas.id, id)).for("update");
    if (!proposal) throw new Error("Proposta não encontrada.");
    if (proposal.situacao !== "solicitada" && proposal.situacao !== "em_retificacao") throw new Error("A proposta não pode ser editada no status atual.");
    await tx.update(propostas).set({
      atividadeConjunta: input.atividadeConjunta,
      observacoes: input.observacoes,
    }).where(eq(propostas.id, id));
    await tx.delete(propostaEspecificidades).where(eq(propostaEspecificidades.propostaId, id));
    await tx.delete(propostaBases).where(eq(propostaBases.propostaId, id));
    await insertProposalScope(tx, id, input);
    await tx.insert(propostaHistorico).values({
      propostaId: id,
      acao: "editada",
      statusAnterior: proposal.situacao,
      statusNovo: proposal.situacao,
      descricao: "Dados e escopo da proposta atualizados.",
      usuario: userName(session),
    });
  });
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  redirect(`/propostas/${id}`);
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

export async function marcarPropostaEnviada(fd: FormData) {
  const session = await requireServerActionPermission();
  const id = required(fd, "id");
  const proposal = await proposalById(id);
  assertPropostaTransition(proposal.situacao, "enviada");
  const [document] = await db.select({ id: documentos.id }).from(documentos).where(eq(documentos.propostaId, id)).limit(1);
  if (!document) throw new Error("A proposta não possui documento gerado.");
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(propostas).set({ situacao: "enviada", enviadaAt: new Date() }).where(and(eq(propostas.id, id), eq(propostas.situacao, "gerada"))).returning({ id: propostas.id });
    if (!updated) throw new Error("A proposta não está mais disponível para envio.");
    await tx.insert(propostaHistorico).values({
      propostaId: id,
      acao: "enviada_manualmente",
      statusAnterior: "gerada",
      statusNovo: "enviada",
      descricao: "Proposta marcada como enviada manualmente; o documento pode ter sido encaminhado por outro meio.",
      usuario: userName(session),
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

    const proposalBaseRows = await tx.select().from(propostaBases).where(eq(propostaBases.propostaId, id)).orderBy(propostaBases.id).for("update");
    const proposalModuleRows = proposalBaseRows.length
      ? await tx.select().from(propostaModulos).where(inArray(propostaModulos.propostaBaseId, proposalBaseRows.map((base) => base.id))).orderBy(propostaModulos.id).for("update")
      : [];
    const hadPendingItems = proposalBaseRows.some((base) => !base.baseId) || proposalModuleRows.some((module) => !module.baseModuleId);
    if (proposal.municipioId && !hadPendingItems) return { changed: false, municipioId: proposal.municipioId, createdClient: false, createdBases: 0, createdModules: 0, reusedBases: 0, reusedModules: 0 };

    let client: typeof municipios.$inferSelect | undefined;
    let createdClient = false;
    if (proposal.municipioId) {
      [client] = await tx.select().from(municipios).where(eq(municipios.id, proposal.municipioId)).for("update");
      if (!client) throw new Error("O cliente vinculado à proposta não foi encontrado.");
    } else {
      const clientMatchKey = proposal.codigoIbge ?? `${proposal.uf}:${norm(proposal.municipioNome.trim())}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`proposta-cliente:${clientMatchKey}`}))`);
      let candidates: (typeof municipios.$inferSelect)[];
      if (proposal.codigoIbge) {
        candidates = await tx.select().from(municipios).where(eq(municipios.codigoIbge, proposal.codigoIbge)).orderBy(municipios.id).for("update");
      } else {
        const sameUf = await tx.select().from(municipios).where(sql`lower(${municipios.uf}) = lower(${proposal.uf})`).orderBy(municipios.id).for("update");
        candidates = sameUf.filter((item) => norm(item.municipio.trim()) === norm(proposal.municipioNome.trim()));
      }
      client = selectProposalClientCandidate(candidates) ?? undefined;
      if (!client) {
        [client] = await tx.insert(municipios).values({
          clienteNome: proposal.clienteNomeSnapshot,
          municipio: proposal.municipioNome,
          uf: proposal.uf,
          codigoIbge: proposal.codigoIbge,
          situacao: "em_negociacao",
          observacoes: `Cliente criado automaticamente a partir da proposta aceita ${proposal.id}.`,
        }).returning();
        createdClient = true;
        await tx.insert(eventos).values({
          tipo: "cliente_criado_via_proposta",
          descricao: `Cliente ${client.clienteNome} criado a partir da proposta aceita.`,
          municipioId: client.id,
          data: today(),
          usuario,
        });
      }
      await tx.update(propostas).set({ municipioId: client.id }).where(eq(propostas.id, id));
    }
    if (client.situacao === "cliente_encerrado") throw new Error("Cliente encerrado não pode receber bases ou módulos.");
    const municipioId = client.id;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`proposta-materializacao:${municipioId}`}))`);

    const linkedDocuments = await tx.update(documentos).set({ municipioId }).where(eq(documentos.propostaId, id)).returning({ id: documentos.id });
    if (linkedDocuments.length > 0) {
      await tx.insert(eventos).values({
        tipo: "documentos_proposta_vinculados",
        descricao: `${linkedDocuments.length} versão(ões) do documento da proposta vinculada(s) ao cliente.`,
        municipioId,
        data: today(),
        usuario,
      });
    }

    const clientBases = await tx.select().from(bases).where(eq(bases.municipioId, municipioId)).orderBy(bases.id).for("update");
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
          municipioId,
          nome: proposalBase.nome,
          tipo: proposalBase.tipo ?? "Outros",
          situacao: "ativa",
        }).returning();
        clientBases.push(targetBase);
        createdBases += 1;
        await tx.insert(eventos).values({
          tipo: "base_criada_via_proposta",
          descricao: `Base ${targetBase.nome} criada a partir da proposta aceita.`,
          municipioId,
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
            tipo: "modulo_criado_via_proposta",
            descricao: `Módulo ${targetModule.nome} criado a partir da proposta aceita.`,
            municipioId,
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
      descricao: `${createdClient ? "Cliente criado; " : "Cliente existente reutilizado; "}${createdBases} base(s) e ${createdModules} módulo(s) criados; ${reusedBases} base(s) e ${reusedModules} módulo(s) existentes reutilizados; ${linkedDocuments.length} documento(s) vinculado(s).`,
      usuario,
    });
    return { changed: true, municipioId, createdClient, createdBases, createdModules, reusedBases, reusedModules };
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
    revalidatePath(`/clientes/${result.municipioId}`);
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
  if (status === "aceita" && text(fd, "criarCadastros") === "sim") {
    try {
      const result = await materializeAcceptedProposal(id, userName(session));
      if (result.changed) await syncPendencias();
      revalidatePath(`/clientes/${result.municipioId}`);
    } catch (error) {
      await recordMaterializationFailure(id, userName(session), error);
    }
  }
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  if (status === "aceita") revalidatePath("/clientes", "layout");
}
