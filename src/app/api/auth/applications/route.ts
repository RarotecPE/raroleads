import { NextRequest, NextResponse } from "next/server";
import { getRaroNexusConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

type NexusApplication = {
  nome?: string;
  client_id?: string;
  clientId?: string;
  logo_url?: string | null;
  logoUrl?: string | null;
  homepage_url?: string | null;
  homepageUrl?: string | null;
  ativo?: boolean;
};

type NexusApplicationsPayload = {
  success?: boolean;
  data?: NexusApplication[];
  applications?: NexusApplication[];
  message?: string;
};

type HeaderApplication = {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
};

function nexusHomeApplication(request: NextRequest, nexusBaseUrl: string): HeaderApplication {
  return {
    nome: "RaroNexus",
    client_id: "raronexus",
    logo_url: new URL("/raronexus-logo.png", request.nextUrl.origin).toString(),
    homepage_url: new URL("/home", nexusBaseUrl).toString(),
  };
}

export async function GET(request: NextRequest) {
  const config = getRaroNexusConfig(request);
  const token = request.cookies.get(config.cookies.session)?.value;

  if (!token) {
    return NextResponse.json({ error: "Sessao nao encontrada." }, { status: 401 });
  }

  if (!config.raronexusBaseUrl) {
    return NextResponse.json({ error: "RaroNexus nao configurado." }, { status: 502 });
  }

  let response: Response;
  let payload: NexusApplicationsPayload | null;

  try {
    response = await fetch(new URL("/api/v1/applications", config.raronexusBaseUrl), {
      headers: {
        Cookie: `raronexus_global_session=${encodeURIComponent(token)}`,
      },
      cache: "no-store",
    });
    payload = (await response.json().catch(() => null)) as NexusApplicationsPayload | null;
  } catch {
    return NextResponse.json({ error: "Nao foi possivel carregar os aplicativos." }, { status: 502 });
  }

  const source = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.applications)
      ? payload.applications
      : null;

  if (!response.ok || !source || payload?.success === false) {
    return NextResponse.json(
      { error: payload?.message ?? "Nao foi possivel carregar os aplicativos." },
      { status: response.status || 502 },
    );
  }

  const applications = source
    .filter((application) => {
      const clientId = application.client_id ?? application.clientId;
      const homepageUrl = application.homepage_url ?? application.homepageUrl;
      return application.ativo !== false && clientId !== config.clientId && Boolean(homepageUrl);
    })
    .map<HeaderApplication>((application) => ({
      nome: application.nome ?? "Aplicativo",
      client_id: application.client_id ?? application.clientId ?? "application",
      logo_url: application.logo_url ?? application.logoUrl ?? null,
      homepage_url: application.homepage_url ?? application.homepageUrl ?? "",
    }));

  if (config.clientId !== "raronexus" && !applications.some((item) => item.client_id === "raronexus")) {
    applications.unshift(nexusHomeApplication(request, config.raronexusBaseUrl));
  }

  return NextResponse.json({
    applications,
    nexusProfileUrl: new URL("/profile", config.raronexusBaseUrl).toString(),
  });
}
