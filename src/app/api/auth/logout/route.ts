import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getRaroNexusConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const config = getRaroNexusConfig(request);
  const token = request.cookies.get(config.cookies.session)?.value;

  if (token && config.raronexusBaseUrl) {
    try {
      await fetch(`${config.raronexusBaseUrl}/api/v1/sessions/revoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token }),
      });
    } catch {
      // Logout local deve funcionar mesmo se o RaroNexus estiver indisponivel.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
