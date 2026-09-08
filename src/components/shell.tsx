"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { HeaderActions } from "@/components/header-actions";
import { OperationLoadingProvider } from "@/components/operation-loading";
import { APP } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/pendencias", label: "Pendências", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

/** Ativo quando o path é igual ao href ou começa com href + "/" (schema). */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <OperationLoadingProvider>
      {/* Sidebar fixa — desktop (16rem, w-64) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-app-border bg-app-surface lg:flex">
        <Link
          href="/dashboard"
          aria-label="Ir para o dashboard"
          className="flex h-16 items-center gap-2.5 border-b border-app-border px-5 transition-colors hover:bg-app-surface-elevated/40"
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-app-md bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/raroleads-logo.jpeg" alt="RaroLeads" className="h-full w-full object-contain" />
          </span>
          <div className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-white">
                  Raro<span className="text-blue-400">Leads</span>
            </span>
            <p className="text-[11px] text-app-muted-foreground">Gestão de clientes</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-app-md px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-app-primary/10 text-app-primary"
                    : "text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-app-border p-3">
          <p className="px-2 text-[11px] leading-relaxed text-app-muted-foreground">
            Fonte única de informação: clientes, bases, módulos, contratos e histórico.
          </p>
        </div>
      </aside>

      {/* Header sticky (4rem, h-16) */}
      <header className="sticky top-0 z-[45] flex h-16 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur sm:px-6 lg:ml-64 lg:pl-6 lg:pr-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Ir para o dashboard"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-app-md bg-white p-1 transition-opacity hover:opacity-85 lg:hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/raroleads-logo.jpeg" alt="RaroLeads" className="h-full w-full object-contain" />
          </Link>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-app-muted-foreground lg:hidden">{APP.name}</p>
            <h1 className="text-base font-bold text-white lg:text-lg">{current?.label ?? APP.name}</h1>
          </div>
        </div>
        <HeaderActions />
      </header>

      {/* Conteúdo — spacing do schema; espaço reservado para a bottom nav no mobile */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Navegação inferior fixa — mobile */}
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-app-border bg-app-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[40px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                active ? "text-app-primary" : "text-app-muted-foreground hover:text-app-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      </OperationLoadingProvider>
    </AuthProvider>
  );
}
