export type AppRole = "usuario" | "gestor";

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
}

export interface AuthRole {
  id?: string;
  chave: string;
  nome: string;
}

export interface AppSession {
  role: AppRole;
  roleLabel: string;
  user: AuthUser;
  permissions: AppPermissions;
}

export interface AppPermissions {
  view: boolean;
  manage: boolean;
}

export interface SessionResponse {
  authenticated: boolean;
  role: AppRole | null;
  label?: string;
  description?: string;
  user?: AuthUser;
  permissions: AppPermissions | Record<string, never>;
}
