import assert from "node:assert/strict";
import test from "node:test";
import { assertPropostaTransition, assertUniqueProposalScope, canonicalProposalBaseType, canonicalProposalModuleName, propostaHistoricoAcaoLabel } from "./proposal";

test("aceita somente transições orientadas pelas ações da proposta", () => {
  assert.doesNotThrow(() => assertPropostaTransition("solicitada", "gerada"));
  assert.doesNotThrow(() => assertPropostaTransition("gerada", "enviada"));
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
