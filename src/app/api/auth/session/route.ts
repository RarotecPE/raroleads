import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getLocalSessionFromCookieStore,
  getRemoteSessionFromCookieStore,
  sessionToResponse,
  setLocalSessionCookie,
  unauthenticatedResponse,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const localSession = getLocalSessionFromCookieStore(request.cookies);
  const session = localSession ?? await getRemoteSessionFromCookieStore(request.cookies);
  if (!session) {
    const response = NextResponse.json(unauthenticatedResponse());
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json(sessionToResponse(session));
  if (!localSession) setLocalSessionCookie(response, session);
  return response;
}
