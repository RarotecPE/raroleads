import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_CLIENT_ID = "raroleads";

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const clientId = process.env.RARONEXUS_CLIENT_ID ?? DEFAULT_CLIENT_ID;
  const token = request.cookies.get(`${clientId}_global_session`)?.value;

  if (!token) return loginRedirect(request);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
