"use client";

import { LogIn } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APP } from "@/lib/constants";
import { btnPrimary } from "@/components/ui";
import type { SessionResponse } from "@/lib/auth-types";

function sanitizeNext(value: string | null) {
  if (!value) return "/dashboard";
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/api/")) return "/dashboard";
    return decoded;
  } catch {
    return "/dashboard";
  }
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(() => sanitizeNext(params.get("next")), [params]);
  const [message, setMessage] = useState<string | null>(null);
  const [silentDone, setSilentDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SessionResponse) => {
        if (!cancelled && data.authenticated) router.replace(next);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "raronexus:sso") return;
      if (event.data.status === "success") {
        router.replace(sanitizeNext(event.data.redirectTo));
        return;
      }
      if (event.data.mode === "interactive") {
        setMessage(event.data.message ?? "Nao foi possivel entrar com RaroNexus.");
      }
      setSilentDone(true);
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => setSilentDone(true), 3500);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [router]);

  const startLogin = () => {
    setMessage(null);
    const popup = window.open(
      `/api/auth/raronexus/start?next=${encodeURIComponent(next)}`,
      "raronexus-login",
      "width=520,height=720,menubar=no,toolbar=no,location=yes,status=no",
    );
    if (!popup) setMessage("Permita popups para entrar com o RaroNexus.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background px-4 py-10">
      <iframe
        title="SSO silencioso RaroNexus"
        src={`/api/auth/raronexus/start?mode=silent&next=${encodeURIComponent(next)}`}
        className="hidden"
      />
      <section className="w-full max-w-md rounded-app-lg border border-app-border bg-app-surface p-6 shadow-app-elevated">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-app-muted-foreground">{APP.shortName}</p>
          <h1 className="mt-2 text-2xl font-bold text-app-foreground">Entrar no {APP.name}</h1>
          <p className="mt-2 text-sm leading-6 text-app-muted-foreground">
            Use sua conta RaroNexus para acessar a central administrativa.
          </p>
        </div>

        {message ? (
          <div className="mb-4 rounded-app-md border border-app-danger/40 bg-app-danger/10 px-3 py-2 text-sm text-app-foreground">
            {message}
          </div>
        ) : null}

        <button type="button" onClick={startLogin} className={`${btnPrimary} w-full`}>
          <LogIn className="h-4 w-4" />
          Entrar com RaroNexus
        </button>
        {!silentDone ? (
          <p className="mt-3 text-center text-xs text-app-muted-foreground">Verificando sessao existente...</p>
        ) : null}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
