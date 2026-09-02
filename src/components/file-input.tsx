"use client";

import { useId, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function FileInput({ className, id, onChange, disabled, ...props }: FileInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [fileName, setFileName] = useState("Nenhum arquivo escolhido");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "Nenhum arquivo escolhido");
    onChange?.(event);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        {...props}
        id={inputId}
        type="file"
        disabled={disabled}
        onChange={handleChange}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <label
        htmlFor={inputId}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center gap-3 rounded-app-md border border-app-border bg-app-surface px-3 text-sm text-app-foreground transition-colors",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-app-primary",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Paperclip className="h-4 w-4 shrink-0 text-app-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-app-muted-foreground">{fileName}</span>
        <span className="shrink-0 rounded-app-sm bg-app-surface-elevated px-2.5 py-1 text-xs font-semibold text-app-foreground transition-colors">
          Escolher arquivo
        </span>
      </label>
    </div>
  );
}
