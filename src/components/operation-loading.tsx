"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface OperationLoadingContextValue {
  start: () => () => void;
}

const OperationLoadingContext = createContext<OperationLoadingContextValue | null>(null);

export function OperationLoadingProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  const start = useCallback(() => {
    let released = false;
    setPendingCount((count) => count + 1);

    return () => {
      if (released) return;
      released = true;
      setPendingCount((count) => Math.max(0, count - 1));
    };
  }, []);

  const value = useMemo(() => ({ start }), [start]);
  const loading = pendingCount > 0;

  return (
    <OperationLoadingContext.Provider value={value}>
      {children}
      {loading ? (
        <div
          className="fixed inset-0 z-[80] grid cursor-wait place-items-center bg-slate-950/55 px-4 backdrop-blur-app-overlay"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            role="status"
            className={cn(
              "flex w-full max-w-xs items-center gap-3 rounded-app-lg border border-app-border",
              "bg-app-surface px-4 py-3 text-app-foreground shadow-app-elevated",
            )}
          >
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-app-primary border-t-transparent" />
            <span className="text-sm font-semibold">Processando operação...</span>
          </div>
        </div>
      ) : null}
    </OperationLoadingContext.Provider>
  );
}

export function useOperationLoading() {
  return useContext(OperationLoadingContext);
}

export function OperationLoadingTracker({ active }: { active: boolean }) {
  const loading = useOperationLoading();

  useEffect(() => {
    if (!active) return;
    return loading?.start();
  }, [active, loading]);

  return null;
}
