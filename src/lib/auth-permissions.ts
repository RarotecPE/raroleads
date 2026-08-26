import type { AppPermissions, AppRole } from "@/lib/auth-types";

export const AUTHORIZED_ROLES = ["admin", "gestor", "visualizador"] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  visualizador: "Visualizador",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acesso completo ao Central de Clientes.",
  gestor: "Pode consultar e manter dados operacionais.",
  visualizador: "Pode consultar os dados, sem alterar registros.",
};

export function isAuthorizedRole(role: string | null | undefined): role is AppRole {
  return AUTHORIZED_ROLES.includes(role as AppRole);
}

export function permissionsForRole(role: AppRole): AppPermissions {
  return {
    view: true,
    manage: role === "admin" || role === "gestor",
  };
}

export const canView = (permissions: AppPermissions) => permissions.view;
export const canManage = (permissions: AppPermissions) => permissions.manage;
