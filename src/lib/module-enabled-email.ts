import { sendRaroNexusEmail } from "@/lib/raronexus-email";

export type ModuleEnabledEmailContext = {
  moduleId: string;
  moduleName: string;
  baseName: string;
  municipalityId: string;
  customerName: string;
  enabledAt: string;
  requesterName: string | null;
  requesterEmail: string;
  requestOrigin: string | null;
};

export function isValidEmail(value: string | null | undefined) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function moduleEnabledRequesterEmail(
  requesterName: string | null | undefined,
  requesterEmail: string | null | undefined,
) {
  const email = requesterEmail?.trim() || null;
  if (email && !isValidEmail(email)) {
    throw new Error("Informe um e-mail válido para o solicitante.");
  }
  if (requesterName?.trim() && !email) {
    throw new Error("Informe o e-mail do solicitante.");
  }
  return email;
}

export function moduleEnabledRequestOrigin(
  requesterName: string | null | undefined,
  requestOrigin: string | null | undefined,
) {
  const origin = requestOrigin?.trim() || null;
  if (requesterName?.trim() && !origin) {
    throw new Error("Informe a origem da solicitação.");
  }
  return origin;
}

export function needsModuleEnabledEmailPending(input: {
  enabledAt: string | null;
  requesterEmail: string | null;
  sentAt: Date | null;
}) {
  return Boolean(input.enabledAt && input.requesterEmail && !input.sentAt);
}

export function canRetryModuleEnabledEmail(
  input: Parameters<typeof needsModuleEnabledEmailPending>[0],
  readOnly: boolean,
) {
  return !readOnly && needsModuleEnabledEmailPending(input);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeSubjectValue(value: string) {
  return value.replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

export function buildModuleEnabledEmail(context: ModuleEnabledEmailContext) {
  const greeting = context.requesterName?.trim() || "Solicitante";
  const origin = context.requestOrigin?.trim();
  const body = [
    `<p>Olá, <strong>${escapeHtml(greeting)}</strong>.</p>`,
    `<p>Informamos que o módulo <strong>${escapeHtml(context.moduleName)}</strong>, da base <strong>${escapeHtml(context.baseName)}</strong>, foi habilitado para <strong>${escapeHtml(context.customerName)}</strong> no dia ${escapeHtml(formatDate(context.enabledAt))} conforme solicitado via <strong>${origin}</strong>.</p>`,
  ].join("");

  return {
    to: context.requesterEmail.trim(),
    subject: `Módulo ${safeSubjectValue(context.moduleName)} habilitado`,
    body,
    metadata: {
      event: "modulo_habilitado",
      module_id: context.moduleId,
      municipality_id: context.municipalityId,
      recipient_type: "solicitante",
    },
  };
}

export async function notifyModuleEnabled(
  context: ModuleEnabledEmailContext,
  sendEmail: typeof sendRaroNexusEmail = sendRaroNexusEmail,
) {
  return sendEmail(buildModuleEnabledEmail(context));
}

export async function attemptModuleEnabledEmail(
  context: ModuleEnabledEmailContext,
  sendEmail: typeof sendRaroNexusEmail = sendRaroNexusEmail,
) {
  try {
    await notifyModuleEnabled(context, sendEmail);
    return true;
  } catch {
    return false;
  }
}
