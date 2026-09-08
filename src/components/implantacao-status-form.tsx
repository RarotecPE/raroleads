"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { OperationLoadingTracker } from "@/components/operation-loading";
import { IMPLANTACAO_STATUS } from "@/lib/constants";

interface ImplantacaoStatusFormProps {
  id: string;
  municipioId: string;
  defaultValue: string;
  action: (fd: FormData) => void | Promise<void>;
}

export function ImplantacaoStatusForm({
  id,
  municipioId,
  defaultValue,
  action,
}: ImplantacaoStatusFormProps) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.currentTarget.value;
    setSelectedValue(nextValue);

    const formData = new FormData();
    formData.set("id", id);
    formData.set("municipioId", municipioId);
    formData.set("implantacaoStatus", nextValue);

    startTransition(() => {
      void action(formData);
    });
  }

  return (
    <div>
      <OperationLoadingTracker active={isPending} />
      <label className="sr-only" htmlFor={`detail-impl-${id}`}>
        Implantacao
      </label>
      <select
        id={`detail-impl-${id}`}
        name="implantacaoStatus"
        value={selectedValue}
        onChange={handleChange}
        disabled={isPending}
        className="h-8 w-full rounded-app-sm border border-app-border bg-app-surface px-2 text-xs text-app-foreground focus-visible:outline-none"
      >
        {IMPLANTACAO_STATUS.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
