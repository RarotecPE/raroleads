"use client";

import { LogOut, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppPermissions, AppRole, AuthUser, SessionResponse } from "@/lib/auth-types";

interface AuthContextValue {
  loading: boolean;
  authenticated: boolean;
  role: AppRole | null;
  label: string | null;
  user: AuthUser | null;
  permissions: AppPermissions | Record<string, never>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loginUrl(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname || "/dashboard")}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await response.json()) as SessionResponse;
      setSession(data);
      if (!data.authenticated) router.replace(loginUrl(pathname));
    } catch {
      setSession({ authenticated: false, role: null, permissions: {} });
      router.replace(loginUrl(pathname));
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => null);
    router.replace(loginUrl(pathname));
  }, [pathname, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].pathname : args[0].url;
      if (response.status === 401 && url.startsWith("/api/") && !url.startsWith("/api/auth/")) {
        await originalFetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => null);
        router.replace(loginUrl(window.location.pathname + window.location.search));
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      authenticated: Boolean(session?.authenticated),
      role: session?.role ?? null,
      label: session?.label ?? null,
      user: session?.user ?? null,
      permissions: session?.permissions ?? {},
      refresh,
      logout,
    }),
    [loading, logout, refresh, session],
  );

  if (loading || !session?.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-background px-4">
        <div className="w-full max-w-sm rounded-app-lg border border-app-border bg-app-surface p-5">
          <p className="text-sm font-semibold text-app-foreground">Verificando acesso</p>
          <p className="mt-1 text-xs text-app-muted-foreground">Conectando com o RaroNexus...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return value;
}

export function UserMenu() {
  const auth = useAuth();
  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-xs font-semibold text-app-foreground">{auth.user?.nome}</p>
        <p className="truncate text-[11px] text-app-muted-foreground">{auth.label}</p>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-app-md bg-app-surface-elevated text-app-muted-foreground">
        <UserCircle className="h-5 w-5" />
      </span>
      <button
        type="button"
        onClick={() => void auth.logout()}
        aria-label="Sair"
        title="Sair"
        className="inline-flex h-10 w-10 items-center justify-center rounded-app-md text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
