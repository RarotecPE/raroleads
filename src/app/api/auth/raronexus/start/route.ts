import { NextRequest, NextResponse } from "next/server";
import { getRaroNexusConfig, randomState, sanitizeNext, SSO_COOKIE_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getRaroNexusConfig(request);
  if (!config.raronexusBaseUrl || !config.redirectUri) {
    return Response.json({ error: "RaroNexus nao configurado." }, { status: 500 });
  }

  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));
  const mode = request.nextUrl.searchParams.get("mode") === "silent" ? "silent" : "interactive";
  const state = randomState();
  const authorizeUrl = new URL(`${config.raronexusBaseUrl}/sso/authorize`);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("state", state);
  if (mode === "silent") authorizeUrl.searchParams.set("prompt", "none");

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SSO_COOKIE_MAX_AGE,
  };
  response.cookies.set(config.cookies.state, state, cookieOptions);
  response.cookies.set(config.cookies.next, next, cookieOptions);
  response.cookies.set(config.cookies.mode, mode, cookieOptions);

  return response;
}
