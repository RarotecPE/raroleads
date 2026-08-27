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
import { syncPendencias } from "@/lib/domain";

function d(offsetDays: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

async function main() {
  const existing = await db.select().from(municipios);
  if (existing.length > 0) {
    console.log("Seed ignorado: banco já possui dados.");
    await syncPendencias();
    return;
  }

  /* -------- Tacaratu (cliente ativo) -------- */
  const [tacaratu] = await db
    .insert(municipios)
    .values({
      clienteNome: "Prefeitura Municipal de Tacaratu",
      municipio: "Tacaratu",
      uf: "PE",
      codigoIbge: "2612508",
      populacao: 24151,
      situacao: "cliente_ativo",
      dadosAdministrativos: "Gestão 2025–2028. Contato principal com o gabinete.",
      observacoes: "Cliente histórico; relação iniciada por indicação regional.",
    })
    .returning();

  const [tPref] = await db
    .insert(bases)
    .values({ municipioId: tacaratu.id, nome: "Prefeitura", tipo: "Prefeitura", cnpj: "07.954.965/0001-26" })
    .returning();
  const [tSaude] = await db
    .insert(bases)
    .values({ municipioId: tacaratu.id, nome: "Secretaria de Saúde", tipo: "Saúde", cnpj: "07.954.965/0002-07" })
    .returning();
  const [tCamara] = await db
    .insert(bases)
    .values({ municipioId: tacaratu.id, nome: "Câmara Municipal", tipo: "Câmara" })
    .returning();

  const [tContab] = await db
    .insert(baseModules)
    .values({
      baseId: tPref.id,
      nome: "Contabilidade",
      solicitacaoAt: d(-32),
      solicitacaoOrigem: "contrato",
      solicitante: "Contador responsável",
      habilitadoAt: d(-30),
      migracaoInicio: d(-30),
      migracaoFim: d(-11),
      implantacaoStatus: "concluida",
      execucaoInicio: d(-10),
    })
    .returning();
  const [tRh] = await db
    .insert(baseModules)
    .values({
      baseId: tPref.id,
      nome: "RH",
      habilitadoAt: d(-14),
      implantacaoStatus: "em_andamento",
      observacoes: "Habilitado por solicitação verbal — formalizar origem.",
    })
    .returning();
  const [tTrib] = await db
    .insert(baseModules)
    .values({ baseId: tPref.id, nome: "Tributos", solicitacaoAt: d(-5), solicitacaoOrigem: "email" })
    .returning();
  const [tPortal] = await db.insert(baseModules).values({ baseId: tPref.id, nome: "Portal" }).returning();
  const [tSaudeContab] = await db
    .insert(baseModules)
    .values({ baseId: tSaude.id, nome: "Contabilidade", habilitadoAt: d(-7), solicitacaoAt: d(-8), solicitacaoOrigem: "reuniao" })
    .returning();
  const [tSaudeAlmox] = await db.insert(baseModules).values({ baseId: tSaude.id, nome: "Almoxarifado" }).returning();
  const [tCamaraContab] = await db
    .insert(baseModules)
    .values({ baseId: tCamara.id, nome: "Contabilidade" })
    .returning();

  const [propTac] = await db
    .insert(propostas)
    .values({
      municipioId: tacaratu.id,
      tipo: "formal",
      data: d(-75),
      situacao: "convertida",
      basesEnvolvidas: "Prefeitura, Saúde",
      modulosEnvolvidos: "Contabilidade, RH, Tributos, Portal",
      observacoes: "Proposta apresentada ao prefeito e ao contador.",
    })
    .returning();

  const [ctTac] = await db
    .insert(contratos)
    .values({
      municipioId: tacaratu.id,
      propostaId: propTac.id,
      numero: "014/2025",
      modalidade: "dispensa",
      processo: "2025.014.0001-9",
      dataAssinatura: d(-40),
      dataInicio: d(-40),
      dataFim: d(35),
      situacao: "vigente",
      observacoes: "Vigência de 12 meses com prorrogação automática se acordado.",
    })
    .returning();

  await db.insert(contratoModulos).values([
    { contratoId: ctTac.id, baseModuleId: tContab.id },
    { contratoId: ctTac.id, baseModuleId: tRh.id },
    { contratoId: ctTac.id, baseModuleId: tTrib.id },
    { contratoId: ctTac.id, baseModuleId: tSaudeContab.id },
  ]);

  await db.insert(aditivos).values({
    contratoId: ctTac.id,
    tipo: "inclusao_modulo",
    data: d(-20),
    descricao: "Inclusão do módulo de Tributos na base Prefeitura.",
  });

  await db.insert(documentos).values([
    {
      municipioId: tacaratu.id,
      contratoId: ctTac.id,
      tipo: "contrato_assinado",
      nome: "contrato_014_2025_assinado.pdf",
      referencia: "/arquivos/tacaratu/contrato_014_2025_assinado.pdf",
    },
    {
      municipioId: tacaratu.id,
      contratoId: ctTac.id,
      tipo: "aditivo",
      nome: "aditivo_tributos.pdf",
      referencia: "/arquivos/tacaratu/aditivo_tributos.pdf",
    },
  ]);

  /* -------- Paulista (cliente ativo com pendências) -------- */
  const [paulista] = await db
    .insert(municipios)
    .values({
      clienteNome: "Prefeitura Municipal de Paulista",
      municipio: "Paulista",
      uf: "PE",
      codigoIbge: "2610700",
      populacao: 334376,
      situacao: "cliente_ativo",
      dadosAdministrativos: "Prefeitura com secretarias descentralizadas.",
    })
    .returning();

  const [pPref] = await db
    .insert(bases)
    .values({ municipioId: paulista.id, nome: "Prefeitura", tipo: "Prefeitura", cnpj: "10.709.764/0001-03" })
    .returning();
  const [pSaude] = await db
    .insert(bases)
    .values({ municipioId: paulista.id, nome: "Saúde", tipo: "Saúde", cnpj: "10.709.764/0002-94" })
    .returning();
  await db.insert(bases).values({ municipioId: paulista.id, nome: "Educação", tipo: "Educação", cnpj: "10.709.764/0003-75" });

  const [pContab] = await db
    .insert(baseModules)
    .values({
      baseId: pPref.id,
      nome: "Contabilidade",
      habilitadoAt: d(-60),
      solicitacaoAt: d(-62),
      solicitacaoOrigem: "contrato",
      execucaoInicio: d(-40),
      implantacaoStatus: "concluida",
    })
    .returning();
  const [pPortal] = await db.insert(baseModules).values({ baseId: pPref.id, nome: "Portal" }).returning();
  const [pAlmox] = await db
    .insert(baseModules)
    .values({
      baseId: pSaude.id,
      nome: "Almoxarifado",
      habilitadoAt: d(-6),
      observacoes: "Habilitado a pedido do secretário via WhatsApp.",
    })
    .returning();

  const [ctPau] = await db
    .insert(contratos)
    .values({
      municipioId: paulista.id,
      numero: "203/2023",
      modalidade: "licitacao",
      processo: "PL 089/2023",
      dataAssinatura: d(-400),
      dataInicio: d(-400),
      dataFim: d(-35),
      situacao: "vigente",
      observacoes: "Vencido — aguardando renovação formal.",
    })
    .returning();

  await db.insert(contratoModulos).values([
    { contratoId: ctPau.id, baseModuleId: pContab.id },
    { contratoId: ctPau.id, baseModuleId: pPortal.id },
  ]);

  const [ctPauNovo] = await db
    .insert(contratos)
    .values({
      municipioId: paulista.id,
      numero: "118/2026",
      modalidade: "adesao",
      processo: "AR 012/2026",
      dataInicio: d(5),
      dataFim: d(370),
      situacao: "aguardando_assinatura",
      observacoes: "Ata de registro de preços — minuta enviada.",
    })
    .returning();

  await db.insert(documentos).values({
    municipioId: paulista.id,
    contratoId: ctPauNovo.id,
    tipo: "contrato_sem_assinatura",
    nome: "minuta_118_2026.pdf",
    referencia: "/arquivos/paulista/minuta_118_2026.pdf",
  });

  /* -------- Vitória de Santo Antão (em negociação) -------- */
  const [vitoria] = await db
    .insert(municipios)
    .values({ clienteNome: "Prefeitura Municipal de Vitoria de Santo Antao", municipio: "Vitória de Santo Antão", uf: "PE", codigoIbge: "2616400", populacao: 134688, situacao: "em_negociacao" })
    .returning();

  const [vPref] = await db
    .insert(bases)
    .values({ municipioId: vitoria.id, nome: "Prefeitura", tipo: "Prefeitura", cnpj: "08.309.615/0001-43" })
    .returning();

  await db.insert(propostas).values({
    municipioId: vitoria.id,
    tipo: "pregao",
    data: d(-9),
    situacao: "apresentada",
    basesEnvolvidas: "Prefeitura",
    modulosEnvolvidos: "Contabilidade, RH, Frota, Compras",
    observacoes: "Pregão eletrônico — aguardando resultado.",
  });

  /* -------- Carpina (prospect) -------- */
  await db.insert(municipios).values({
    clienteNome: "Prefeitura Municipal de Carpina",
    municipio: "Carpina",
    uf: "PE",
    codigoIbge: "2604009",
    populacao: 86241,
    situacao: "prospect",
    observacoes: "Primeiro contato em evento da AMUPE.",
  });

  /* -------- Eventos de exemplo (linha do tempo) -------- */
  await db.insert(eventos).values([
    { municipioId: tacaratu.id, tipo: "municipio_criado", descricao: "Município Tacaratu criado.", data: d(-75), usuario: "Equipe Interna" },
    { municipioId: tacaratu.id, baseId: tPref.id, tipo: "base_criada", descricao: "Base Prefeitura criada.", data: d(-75), usuario: "Equipe Interna" },
    { municipioId: tacaratu.id, tipo: "proposta_situacao", descricao: "Proposta aceita pelo município.", data: d(-60), usuario: "Equipe Interna" },
    { municipioId: tacaratu.id, baseModuleId: tContab.id, tipo: "habilitacao_solicitada", descricao: "Solicitada habilitação da Contabilidade.", data: d(-32), usuario: "Equipe Interna" },
    { municipioId: tacaratu.id, baseModuleId: tContab.id, tipo: "habilitado", descricao: "Contabilidade habilitada.", data: d(-30), usuario: "Equipe Interna" },
    { municipioId: tacaratu.id, contratoId: ctTac.id, tipo: "contrato_criado", descricao: "Contrato 014/2025 recebido.", data: d(-42), usuario: "Equipe Interna" },
    { municipioId: tacaratu.id, contratoId: ctTac.id, tipo: "contrato_situacao", descricao: "Contrato 014/2025 assinado e vigente.", data: d(-40), usuario: "Equipe Interna" },
    { municipioId: paulista.id, baseModuleId: pAlmox.id, tipo: "habilitado", descricao: "Almoxarifado habilitado na Saúde (pedido via WhatsApp).", data: d(-6), usuario: "Equipe Interna" },
  ]);

  /* Pendência manual de exemplo */
  await db.insert(pendencias).values({
    tipo: "manual",
    descricao: "Confirmar dados administrativos da nova gestão em Vitória de Santo Antão.",
    origem: "manual",
    municipioId: vitoria.id,
  });

  await syncPendencias();

  console.log("Seed concluído:", {
    municipios: [tacaratu.municipio, paulista.municipio, vitoria.municipio, "Carpina"],
    modulosExemplo: [tRh.nome, tPortal.nome, tSaudeAlmox.nome, tCamaraContab.nome],
  });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
