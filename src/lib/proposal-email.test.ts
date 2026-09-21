import assert from "node:assert/strict";
import test from "node:test";
import { buildProposalEmail, PROPOSAL_EMAIL_PATH, sendProposalEmail } from "./proposal-email";

test("gera e-mail de proposta com anexo e metadados", () => {
  const email = buildProposalEmail({
    proposalId: "p1", modality: "consultoria", customerName: "Cliente <Teste>",
    recipientName: "Ana & João", recipientEmail: "ana@example.com", version: 2,
    municipalityId: "m1", attachment: { filename: "proposta.pdf", content_type: "application/pdf", content_base64: "YWJj" },
  });
  assert.equal(PROPOSAL_EMAIL_PATH, "/api/email/proposta-enviada");
  assert.equal(email.to, "ana@example.com");
  assert.match(email.body, /Cliente &lt;Teste&gt;/);
  assert.equal(email.attachments[0].content_base64, "YWJj");
  assert.equal(email.metadata.document_version, 2);
});

test("envia a proposta para o endpoint dedicado do RaroNexus", async () => {
  let endpoint = "";
  await sendProposalEmail({
    proposalId: "p1", modality: "implantacao_sistema", customerName: "Cliente",
    recipientName: "Ana", recipientEmail: "ana@example.com", version: 1,
    municipalityId: null, attachment: { filename: "proposta.pdf", content_type: "application/pdf", content_base64: "YWJj" },
  }, async (_payload, selectedEndpoint) => {
    endpoint = selectedEndpoint ?? "";
    return { sent: true as const, messageId: "m1" };
  });
  assert.equal(endpoint, "/api/email/proposta-enviada");
});
