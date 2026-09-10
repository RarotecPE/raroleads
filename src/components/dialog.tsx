"use client";

import { X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type FormEventHandler,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { OperationLoadingTracker } from "@/components/operation-loading";
import { cn } from "@/lib/utils";

const DialogCtx = createContext<{ close: () => void }>({ close: () => {} });

/**
 * Modal do styling schema: overlay central com backdrop + blur,
 * max-width, scroll interno e fechamento por clique fora/Escape.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-app-overlay"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative w-full rounded-app-lg border border-app-border bg-app-surface shadow-app-elevated",
              maxWidth,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-app-border px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-app-foreground">{title}</h2>
                {description ? (
                  <p className="mt-0.5 text-xs text-app-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Fechar"
                title="Fechar"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-app-md text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
              <DialogCtx.Provider value={{ close: () => setOpen(false) }}>{children}</DialogCtx.Provider>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Formulário de dialog que fecha ao enviar (server action). */
export function DialogForm({
  action,
  children,
  className,
  id,
  onSubmit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  id?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const { close } = useContext(DialogCtx);
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    onSubmit?.(event);
    if (!event.defaultPrevented) setSubmitted(true);
  };
  return (
    <form id={id} action={action} onSubmit={handleSubmit as (e: FormEvent) => void} className={cn("flex flex-col gap-4", className)}>
      <DialogSubmitCompletion submitted={submitted} close={close} />
      {children}
    </form>
  );
}

function DialogSubmitCompletion({
  submitted,
  close,
}: {
  submitted: boolean;
  close: () => void;
}) {
  const { pending } = useFormStatus();
  const sawPending = useRef(false);

  useEffect(() => {
    if (!submitted) return;
    if (pending) {
      sawPending.current = true;
      return;
    }
    if (sawPending.current) close();
  }, [close, pending, submitted]);

  return null;
}

export function SubmitButton({
  children,
  className,
  disabled,
  ...rest
}: {
  children: ReactNode;
  className: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "children">) {
  const { pending } = useFormStatus();
  return (
    <>
      <OperationLoadingTracker active={pending} />
      <button type="submit" disabled={pending || disabled} className={className} {...rest}>
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    </>
  );
}
