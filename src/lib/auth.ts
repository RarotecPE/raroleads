import { randomBytes } from "crypto";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, canManage, isAuthorizedRole, permissionsForRole } from "@/lib/auth-permissions";
import type { AppPermissions, AppSession, AuthRole, AuthUser } from "@/lib/auth-types";

type CookieStore = ReadonlyRequestCookies | NextRequest["cookies"];

interface SsoTokenResponse {
  success: boolean;
  message?: string;
  data?: {
    global_session_token: string;
    user: AuthUser;
    role: {
      chave: string;
      nome: string;
    };
  };
}

interface IntrospectResponse {
  success: boolean;
  message?: string;
  data?: {
    active: boolean;
    user: AuthUser;
    role: AuthRole;
  };
}

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const SSO_COOKIE_MAX_AGE = 60 * 5;

const DEFAULT_CLIENT_ID = "raroleads";

export function getRaroNexusConfig(request?: NextRequest) {
  const raronexusBaseUrl = process.env.RARONEXUS_BASE_URL?.replace(/\/+$/, "");
  const clientId = process.env.RARONEXUS_CLIENT_ID ?? DEFAULT_CLIENT_ID;
  const clientSecret = process.env.RARONEXUS_CLIENT_SECRET;
  const appBaseUrl =
    (process.env.APP_BASE_URL ?? process.env.RAROLEADS_BASE_URL ?? request?.nextUrl.origin)?.replace(/\/+$/, "");

  return {
    raronexusBaseUrl,
    clientId,
    clientSecret,
    appBaseUrl,
    redirectUri: appBaseUrl ? `${appBaseUrl}/api/auth/raronexus/callback` : null,
    cookies: {
      session: `${clientId}_global_session`,
      state: `${clientId}_sso_state`,
      next: `${clientId}_sso_next`,
      mode: `${clientId}_sso_mode`,
    },
  };
}

export function sanitizeNext(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/api/")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

export function randomState() {
  return randomBytes(32).toString("hex");
}

export function clearAuthCookies(response: NextResponse | Response) {
  const config = getRaroNexusConfig();
  const cookieResponse = response as NextResponse;
  for (const name of Object.values(config.cookies)) {
    cookieResponse.cookies.delete(name);
  }
}

export async function clearAuthCookiesFromStore() {
  const config = getRaroNexusConfig();
  const store = await cookies();
  for (const name of Object.values(config.cookies)) {
    store.delete(name);
  }
}

function readToken(store: CookieStore) {
  return store.get(getRaroNexusConfig().cookies.session)?.value ?? null;
}

export function sessionToResponse(session: AppSession) {
  return {
    authenticated: true,
    role: session.role,
    label: session.roleLabel,
    description: ROLE_DESCRIPTIONS[session.role],
    user: session.user,
    permissions: session.permissions,
  };
}

export function unauthenticatedResponse() {
  return {
    authenticated: false,
    role: null,
    permissions: {},
  };
}

export async function exchangeCodeForSession(code: string, request: NextRequest): Promise<SsoTokenResponse> {
  const config = getRaroNexusConfig(request);
  if (!config.raronexusBaseUrl || !config.clientSecret || !config.redirectUri) {
    return { success: false, message: "Autenticacao RaroNexus nao configurada." };
  }

  const response = await fetch(`${config.raronexusBaseUrl}/api/v1/sso/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    return { success: false, message: "Falha ao validar o login no RaroNexus." };
  }

  return response.json();
}

export async function getSessionFromCookieStore(store: CookieStore): Promise<AppSession | null> {
  const token = readToken(store);
  if (!token) return null;

  const config = getRaroNexusConfig();
  if (!config.raronexusBaseUrl) return null;

  try {
    const response = await fetch(`${config.raronexusBaseUrl}/api/v1/sessions/introspect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        token,
        client_id: config.clientId,
      }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as IntrospectResponse;
    const roleKey = payload.data?.role?.chave;
    if (!payload.success || !payload.data?.active || !isAuthorizedRole(roleKey)) return null;

    return {
      role: roleKey,
      roleLabel: ROLE_LABELS[roleKey],
      user: payload.data.user,
      permissions: permissionsForRole(roleKey),
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest) {
  return getSessionFromCookieStore(request.cookies);
}

export async function getCurrentSession() {
  return getSessionFromCookieStore(await cookies());
}

export async function requireServerActionPermission(predicate: (permissions: AppPermissions) => boolean = canManage) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Sessao expirada. Entre novamente pelo RaroNexus.");
  if (!predicate(session.permissions)) throw new Error("Seu papel nao permite executar esta acao.");
  return session;
}

export type AuthGuardResult = AppSession | { response: NextResponse };

export async function requirePermission(
  request: NextRequest,
  predicate: (permissions: AppPermissions) => boolean,
): Promise<AuthGuardResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    const response = Response.json(unauthenticatedResponse(), { status: 401 }) as NextResponse;
    clearAuthCookies(response);
    return { response };
  }
  if (!predicate(session.permissions)) {
    return { response: Response.json({ error: "Acesso negado." }, { status: 403 }) as NextResponse };
  }
  return session;
}

export function hasAuthError(result: AuthGuardResult): result is { response: NextResponse } {
  return "response" in result;
}
