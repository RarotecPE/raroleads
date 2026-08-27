import type { ReactNode } from "react";
import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Botões — variantes do styling schema */
export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-app-primary-foreground transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition-colors duration-150 hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md px-3 text-sm font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-danger px-4 text-sm font-semibold text-app-primary-foreground transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnXs =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm border border-app-border bg-app-surface-elevated px-2.5 text-xs font-semibold text-app-foreground transition-colors duration-150 hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnXsGhost =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50";

/* Campos */
export const inputCls =
  "flex h-10 w-full rounded-app-md border border-app-border bg-app-surface px-3 text-sm text-app-foreground placeholder:text-app-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
export const selectCls = cn(inputCls, "appearance-none pr-8");
export const textareaCls =
  "flex w-full rounded-app-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-foreground placeholder:text-app-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
export const labelCls = "text-sm font-medium text-app-foreground";
export const hintCls = "text-xs text-app-muted-foreground";

const TONE_CLS: Record<Tone, string> = {
  primary: "bg-app-primary/15 text-app-primary",
  success: "bg-app-success/15 text-app-success",
  warning: "bg-app-warning/15 text-app-warning",
  danger: "bg-app-danger/15 text-app-danger",
  muted: "bg-app-surface-elevated text-app-muted-foreground",
};

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-app-pill px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-app-lg border border-app-border bg-app-surface", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  right,
  description,
}: {
  title: string;
  right?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-bold text-app-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-app-muted-foreground">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "muted",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-app-lg border border-app-border bg-app-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-app-muted-foreground">{label}</p>
        {icon ? <span className={cn("rounded-app-sm p-1.5", TONE_CLS[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-app-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-app-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-app-md border border-dashed border-app-border p-6 text-center">
      <p className="text-sm font-semibold text-app-foreground">{title}</p>
      {description ? <p className="text-xs text-app-muted-foreground">{description}</p> : null}
    </div>
  );
}

/** Chip Sim/Nao usado na visao consolidada do cliente. */
export function YesNo({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cn("h-1.5 w-1.5 rounded-full", yes ? "bg-app-success" : "bg-app-muted-foreground/40")} />
      <span className="text-app-muted-foreground">{label}:</span>
      <span className={cn("font-semibold", yes ? "text-app-success" : "text-app-muted-foreground")}>
        {yes ? "Sim" : "Não"}
      </span>
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint ? <span className={hintCls}>{hint}</span> : null}
    </div>
  );
}
