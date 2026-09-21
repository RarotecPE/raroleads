import { sendRaroNexusEmail, type RaroNexusEmailAttachment } from "@/lib/raronexus-email";

export const PROPOSAL_EMAIL_PATH = "/api/email/proposta-enviada";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function safeSubject(value: string) {
  return value.replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

export function buildProposalEmail(input: {
  proposalId: string;
  modality: string;
  customerName: string;
  recipientName: string;
  recipientEmail: string;
  version: number;
  municipalityId: string | null;
  attachment: RaroNexusEmailAttachment;
}) {
  return {
    to: input.recipientEmail.trim(),
    subject: `Proposta comercial - ${safeSubject(input.customerName)} - ${safeSubject(input.modality)}`,
    body: `<p>Olá, <strong>${escapeHtml(input.recipientName.trim())}</strong>.</p><p>Encaminhamos em anexo a proposta comercial para <strong>${escapeHtml(input.customerName)}</strong>.</p><p>Ficamos à disposição para quaisquer esclarecimentos.</p>`,
    metadata: {
      event: "proposta_enviada",
      proposal_id: input.proposalId,
      modality: input.modality,
      document_version: input.version,
      municipality_id: input.municipalityId,
    },
    attachments: [input.attachment],
  };
}

export async function sendProposalEmail(
  input: Parameters<typeof buildProposalEmail>[0],
  sendEmail: typeof sendRaroNexusEmail = sendRaroNexusEmail,
) {
  return sendEmail(buildProposalEmail(input), PROPOSAL_EMAIL_PATH);
}
