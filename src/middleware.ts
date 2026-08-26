import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_CLIENT_ID = "raroleads";
const AUTHORIZED_ROLES = new Set(["admin", "gestor", "visualizador"]);

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const next = `${url.pathname}${url.search}`;
  url.pathname = "/login";
  url.search = "";
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const clientId = process.env.RARONEXUS_CLIENT_ID ?? DEFAULT_CLIENT_ID;
  const raronexusBaseUrl = process.env.RARONEXUS_BASE_URL?.replace(/\/+$/, "");
  const token = request.cookies.get(`${clientId}_global_session`)?.value;

  if (!token || !raronexusBaseUrl) return loginRedirect(request);

  try {
    const response = await fetch(`${raronexusBaseUrl}/api/v1/sessions/introspect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ token, client_id: clientId }),
    });
    if (!response.ok) return loginRedirect(request);

    const payload = await response.json();
    const role = payload?.data?.role?.chave;
    if (!payload?.success || !payload?.data?.active || !AUTHORIZED_ROLES.has(role)) {
      return loginRedirect(request);
    }

    return NextResponse.next();
  } catch {
    return loginRedirect(request);
  }
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
