import type { AppPermissions, AppRole } from "@/lib/auth-types";

export const AUTHORIZED_ROLES = ["usuario", "gestor"] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  usuario: "Usuário",
  gestor: "Gestor",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  usuario: "Pode consultar os dados, sem alterar registros.",
  gestor: "Pode consultar e manter dados operacionais.",
};

export function isAuthorizedRole(role: string | null | undefined): role is AppRole {
  return AUTHORIZED_ROLES.includes(role as AppRole);
}

export function permissionsForRole(role: AppRole): AppPermissions {
  return {
    view: true,
    manage: role === "gestor",
  };
}

export const canView = (permissions: AppPermissions) => permissions.view;
export const canManage = (permissions: AppPermissions) => permissions.manage;
