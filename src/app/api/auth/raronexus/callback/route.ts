import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE,
  clearAuthCookies,
  exchangeCodeForSession,
  getRaroNexusConfig,
  sanitizeNext,
  setLocalSessionCookie,
} from "@/lib/auth";
import { isAuthorizedRole, permissionsForRole, ROLE_LABELS } from "@/lib/auth-permissions";

export const dynamic = "force-dynamic";

function callbackPage({
  status,
  mode,
  message,
  redirectTo,
}: {
  status: "success" | "error";
  mode: "interactive" | "silent";
  message: string;
  redirectTo: string;
}) {
  const payload = JSON.stringify({
    type: "raronexus:sso",
    status,
    mode,
    message,
    redirectTo,
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>RaroNexus</title>
</head>
<body>
  <script>
    const payload = ${payload};
    window.opener?.postMessage(payload, window.location.origin);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, window.location.origin);
    }
    if (window.opener) {
      window.close();
    } else if (!window.parent || window.parent === window) {
      window.location.replace(payload.redirectTo);
    }
  </script>
</body>
</html>`;
}

function htmlResponse(body: string, init?: ResponseInit) {
  return new NextResponse(body, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest) {
  const config = getRaroNexusConfig(request);
  const savedState = request.cookies.get(config.cookies.state)?.value;
  const savedNext = sanitizeNext(request.cookies.get(config.cookies.next)?.value);
  const mode = request.cookies.get(config.cookies.mode)?.value === "silent" ? "silent" : "interactive";
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  const fail = (message: string, statusCode = 400) => {
    const response = htmlResponse(callbackPage({ status: "error", mode, message, redirectTo: `/login?next=${encodeURIComponent(savedNext)}` }), {
      status: statusCode,
    });
    clearAuthCookies(response);
    return response;
  };

  if (error) return fail("Nao foi possivel concluir o login pelo RaroNexus.");
  if (!state || !savedState || state !== savedState) return fail("Estado de autenticacao invalido.");
  if (!code) return fail("Codigo de autorizacao ausente.");

  try {
    const payload = await exchangeCodeForSession(code, request);
    const roleKey = payload.data?.role?.chave;
    if (!payload.success || !payload.data?.global_session_token) {
      return fail(payload.message ?? "RaroNexus nao retornou uma sessao valida.", 502);
    }
    if (!isAuthorizedRole(roleKey)) {
      return fail("Seu usuario nao possui acesso autorizado ao Central de Clientes.", 403);
    }

    const response = htmlResponse(
      callbackPage({
        status: "success",
        mode,
        message: "Login realizado com sucesso.",
        redirectTo: savedNext,
      }),
    );
    response.cookies.set(config.cookies.session, payload.data.global_session_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
    setLocalSessionCookie(response, {
      role: roleKey,
      roleLabel: ROLE_LABELS[roleKey],
      user: payload.data.user,
      permissions: permissionsForRole(roleKey),
    });
    response.cookies.delete(config.cookies.state);
    response.cookies.delete(config.cookies.next);
    response.cookies.delete(config.cookies.mode);
    return response;
  } catch {
    return fail("RaroNexus indisponivel no momento.", 502);
  }
}
