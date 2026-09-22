import assert from "node:assert/strict";
import test from "node:test";
import { assertPropostaTransition, assertProposalIdentityUnchanged, assertUniqueProposalScope, canonicalProposalBaseType, canonicalProposalModuleName, hideProposalIds, parseProposalOriginNote, propostaHistoricoAcaoLabel, selectProposalClientCandidate } from "./proposal";

test("aceita somente transições orientadas pelas ações da proposta", () => {
  assert.doesNotThrow(() => assertPropostaTransition("solicitada", "gerada"));
  assert.doesNotThrow(() => assertPropostaTransition("gerada", "enviada"));
  assert.doesNotThrow(() => assertPropostaTransition("gerada", "em_retificacao"));
  assert.doesNotThrow(() => assertPropostaTransition("enviada", "em_retificacao"));
  assert.doesNotThrow(() => assertPropostaTransition("em_retificacao", "gerada"));
  assert.throws(() => assertPropostaTransition("solicitada", "aceita"), /inválida/);
  assert.throws(() => assertPropostaTransition("aceita", "gerada"), /inválida/);
});

test("traduz eventos do histórico e preserva eventos desconhecidos", () => {
  assert.equal(propostaHistoricoAcaoLabel("solicitada"), "Proposta solicitada");
  assert.equal(propostaHistoricoAcaoLabel("documento_gerado"), "Proposta gerada");
  assert.equal(propostaHistoricoAcaoLabel("falha_documento"), "Falha ao gerar proposta");
  assert.equal(propostaHistoricoAcaoLabel("enviada"), "Proposta enviada");
  assert.equal(propostaHistoricoAcaoLabel("envio_falhou"), "Falha no envio da proposta");
  assert.equal(propostaHistoricoAcaoLabel("aceita"), "Proposta aceita");
  assert.equal(propostaHistoricoAcaoLabel("recusada"), "Proposta recusada");
  assert.equal(propostaHistoricoAcaoLabel("em_retificacao"), "Proposta em retificação");
  assert.equal(propostaHistoricoAcaoLabel("editada"), "Proposta editada");
  assert.equal(propostaHistoricoAcaoLabel("enviada_manualmente"), "Proposta marcada como enviada manualmente");
  assert.equal(propostaHistoricoAcaoLabel("cadastros_criados"), "Cadastros da proposta criados");
  assert.equal(propostaHistoricoAcaoLabel("cadastros_criacao_falhou"), "Falha ao criar cadastros da proposta");
  assert.equal(propostaHistoricoAcaoLabel("evento_futuro"), "evento_futuro");
});

test("normaliza apenas módulos e tipos disponíveis no catálogo", () => {
  assert.equal(canonicalProposalModuleName("  contabilidade "), "Contabilidade");
  assert.equal(canonicalProposalModuleName("módulo inventado"), null);
  assert.equal(canonicalProposalBaseType(" saude "), "Saúde");
  assert.equal(canonicalProposalBaseType("tipo inventado"), null);
});

test("rejeita bases e módulos duplicados no escopo", () => {
  assert.doesNotThrow(() => assertUniqueProposalScope([{ nome: "Prefeitura", modulos: [{ nome: "RH" }] }]));
  assert.throws(() => assertUniqueProposalScope([
    { nome: "Saúde", modulos: [{ nome: "RH" }] },
    { nome: "saude", modulos: [{ nome: "Portal" }] },
  ]), /mesma base/);
  assert.throws(() => assertUniqueProposalScope([{ nome: "Prefeitura", modulos: [{ nome: "RH" }, { nome: "rh" }] }]), /repetido/);
});

test("seleciona cliente único para a conversão e rejeita ambiguidades ou encerrados", () => {
  const active = { id: "ativo", situacao: "em_negociacao" };
  assert.equal(selectProposalClientCandidate([]), null);
  assert.equal(selectProposalClientCandidate([active]), active);
  assert.throws(() => selectProposalClientCandidate([active, { id: "outro", situacao: "prospect" }]), /mais de um cliente/);
  assert.throws(() => selectProposalClientCandidate([{ id: "encerrado", situacao: "cliente_encerrado" }]), /encerrado/);
});

test("preserva cliente e modalidade durante a edição", () => {
  const identity = {
    tipo: "implantacao_sistema",
    municipioId: "cliente-1",
    clienteNomeSnapshot: "Prefeitura de Carpina",
    municipioNome: "Carpina",
    uf: "PE",
    codigoIbge: "2604007",
  };
  assert.doesNotThrow(() => assertProposalIdentityUnchanged(identity, { ...identity }));
  assert.throws(() => assertProposalIdentityUnchanged(identity, { ...identity, municipioId: "cliente-2" }), /não podem ser alterados/);
  assert.throws(() => assertProposalIdentityUnchanged(identity, { ...identity, tipo: "consultoria" }), /não podem ser alterados/);
  assert.throws(() => assertProposalIdentityUnchanged(identity, { ...identity, municipioNome: "Recife" }), /não podem ser alterados/);
});

test("extrai a proposta da observação automática sem expor o identificador", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  assert.deepEqual(parseProposalOriginNote(`Cliente criado automaticamente a partir da proposta aceita ${id}.`), {
    before: "Cliente criado automaticamente a partir da ",
    label: "proposta",
    after: " aceita.",
    proposalId: id,
  });
  assert.equal(parseProposalOriginNote("Observação preenchida manualmente."), null);
});

test("remove identificadores de proposta de descrições legadas", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(hideProposalIds(`Base Saúde criada a partir da proposta aceita ${id}.`), "Base Saúde criada a partir da proposta aceita.");
  assert.equal(hideProposalIds(`2 versões do documento da proposta ${id} vinculadas ao cliente.`), "2 versões do documento da proposta vinculadas ao cliente.");
  assert.equal(hideProposalIds("Evento sem proposta vinculada."), "Evento sem proposta vinculada.");
});
