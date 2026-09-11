import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clearAuthCookies,
  getLocalSessionFromCookieStore,
  getRemoteSessionFromCookieStore,
  setLocalSessionCookie,
} from "@/lib/auth";

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
  const response = NextResponse.redirect(url);
  clearAuthCookies(response);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  if (getLocalSessionFromCookieStore(request.cookies)) {
    return NextResponse.next();
  }

  const session = await getRemoteSessionFromCookieStore(request.cookies);
  if (!session) return loginRedirect(request);

  const response = NextResponse.next();
  setLocalSessionCookie(response, session);
  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
