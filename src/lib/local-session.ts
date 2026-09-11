import { createHmac, timingSafeEqual } from "node:crypto";
import { isAuthorizedRole, permissionsForRole, ROLE_LABELS } from "@/lib/auth-permissions";
import type { AppSession, AuthUser } from "@/lib/auth-types";

export const LOCAL_SESSION_MAX_AGE = 60 * 5;

interface LocalSessionPayload {
  version: 1;
  expiresAt: number;
  role: string;
  user: AuthUser;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function validUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AuthUser>;
  return typeof user.id === "string" && typeof user.nome === "string" && typeof user.email === "string";
}

export function createLocalSessionToken(session: AppSession, secret: string, now = Date.now()) {
  if (!secret) throw new Error("RARONEXUS_CLIENT_SECRET nao configurado.");
  const payload: LocalSessionPayload = {
    version: 1,
    expiresAt: Math.floor(now / 1000) + LOCAL_SESSION_MAX_AGE,
    role: session.role,
    user: session.user,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyLocalSessionToken(token: string | null | undefined, secret: string | null | undefined, now = Date.now()): AppSession | null {
  if (!token || !secret) return null;
  const [encoded, receivedSignature, extra] = token.split(".");
  if (!encoded || !receivedSignature || extra) return null;

  const expected = Buffer.from(signature(encoded, secret));
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<LocalSessionPayload>;
    if (
      payload.version !== 1 ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(now / 1000) ||
      !isAuthorizedRole(payload.role) ||
      !validUser(payload.user)
    ) {
      return null;
    }

    return {
      role: payload.role,
      roleLabel: ROLE_LABELS[payload.role],
      user: payload.user,
      permissions: permissionsForRole(payload.role),
    };
  } catch {
    return null;
  }
}
