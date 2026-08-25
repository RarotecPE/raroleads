"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  Layers,
  LayoutDashboard,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { APP } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/municipios", label: "Municípios", icon: Building2 },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/pendencias", label: "Pendências", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

/** Ativo quando o path é igual ao href ou começa com href + "/" (schema). */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.add("theme-light");
      setLight(true);
    }
  }, []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("theme-light", next);
    window.localStorage.setItem("theme", next ? "light" : "dark");
  };
  const Icon = light ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Usar tema escuro" : "Usar tema claro"}
      title={light ? "Usar tema escuro" : "Usar tema claro"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-app-md text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  return (
    <>
      {/* Sidebar fixa — desktop (16rem, w-64) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-app-border bg-app-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-app-border px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-app-md bg-app-primary text-app-primary-foreground">
            <Layers className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-app-foreground">{APP.name}</p>
            <p className="text-[11px] text-app-muted-foreground">Gestão administrativa</p>
          </div>
        </div>
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
            Fonte única de informação: municípios, bases, módulos, contratos e histórico.
          </p>
        </div>
      </aside>

      {/* Header sticky (4rem, h-16) */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-app-border bg-app-surface/80 px-4 backdrop-blur-app-overlay sm:px-6 lg:pl-8 lg:pr-8">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-app-md bg-app-primary text-app-primary-foreground lg:hidden">
            <Layers className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-app-muted-foreground lg:hidden">{APP.name}</p>
            <h1 className="text-base font-bold text-app-foreground">{current?.label ?? APP.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
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
    </>
  );
}
