const MODULE_ENABLED_EMAIL_PATH = "/api/email/modulo-habilitado";

export type RaroNexusEmailPayload = {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
};

type RaroNexusEmailResponse = {
  success?: unknown;
  data?: {
    sent?: unknown;
    message_id?: unknown;
  };
  message?: unknown;
  error?: unknown;
};

function getEnv(name: "RARONEXUS_BASE_URL" | "RARONEXUS_CLIENT_ID" | "RARONEXUS_CLIENT_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function responseErrorMessage(payload: RaroNexusEmailResponse | null) {
  if (typeof payload?.message === "string") return payload.message;
  if (typeof payload?.error === "string") return payload.error;
  return "A API RaroNexus retornou uma resposta sem sucesso.";
}

export async function sendRaroNexusEmail(payload: RaroNexusEmailPayload) {
  const endpoint = MODULE_ENABLED_EMAIL_PATH;
  const url = new URL(endpoint, getEnv("RARONEXUS_BASE_URL"));
  const clientId = getEnv("RARONEXUS_CLIENT_ID");
  const clientSecret = getEnv("RARONEXUS_CLIENT_SECRET");
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RaroNexus-Client-Id": clientId,
        "X-RaroNexus-Client-Secret": clientSecret,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    console.error("raronexus_email_network_error", {
      endpoint,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    throw error;
  }

  const responsePayload = await response.json().catch(() => null) as RaroNexusEmailResponse | null;

  if (!response.ok) {
    const message = responseErrorMessage(responsePayload);
    console.warn("raronexus_email_request_failed", {
      endpoint,
      status: response.status,
      message,
    });
    throw new Error(message);
  }

  if (responsePayload?.success !== true || responsePayload.data?.sent !== true) {
    console.warn("raronexus_email_invalid_response", {
      endpoint,
      status: response.status,
    });
    throw new Error("A API RaroNexus retornou uma resposta inválida.");
  }

  return {
    sent: true as const,
    messageId: typeof responsePayload.data.message_id === "string" ? responsePayload.data.message_id : null,
  };
}
