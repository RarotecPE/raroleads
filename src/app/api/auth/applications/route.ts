import { NextRequest, NextResponse } from "next/server";
import { getRaroNexusConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getRaroNexusConfig(request);
  const token = request.cookies.get(config.cookies.session)?.value;
  if (!token) return NextResponse.json({ applications: [], profileUrl: null });
  if (!config.raronexusBaseUrl) return NextResponse.json({ applications: [], profileUrl: null }, { status: 502 });

  try {
    const response = await fetch(`${config.raronexusBaseUrl}/api/v1/applications`, {
      headers: {
        cookie: `raronexus_global_session=${encodeURIComponent(token)}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ applications: [], profileUrl: `${config.raronexusBaseUrl}/profile` });

    const payload = await response.json();
    const source = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.applications) ? payload.applications : [];
    const applications = source.filter((app: { client_id?: string; clientId?: string }) => {
      const appClientId = app.client_id ?? app.clientId;
      return appClientId !== config.clientId;
    });

    return NextResponse.json({ applications, profileUrl: `${config.raronexusBaseUrl}/profile` });
  } catch {
    return NextResponse.json({ applications: [], profileUrl: `${config.raronexusBaseUrl}/profile` }, { status: 502 });
  }
}
