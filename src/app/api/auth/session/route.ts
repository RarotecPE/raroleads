import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getSessionFromRequest, sessionToResponse, unauthenticatedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    const response = NextResponse.json(unauthenticatedResponse());
    clearAuthCookies(response);
    return response;
  }

  return NextResponse.json(sessionToResponse(session));
}
