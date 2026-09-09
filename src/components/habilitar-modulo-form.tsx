"use client";

import type { FormEventHandler } from "react";
import { DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnXs, inputCls, selectCls } from "@/components/ui";
import { HABILITACAO_ORIGENS } from "@/lib/constants";
import { todayISO } from "@/lib/utils";

const SOLICITANTE_VAZIO_CONFIRM =
  "O campo Solicitante não foi preenchido. Deseja seguir com a habilitação do módulo mesmo assim?";

export function HabilitarModuloForm({
  action,
  id,
  municipioId,
  solicitacaoAt,
}: {
  action: (fd: FormData) => void | Promise<void>;
  id: string;
  municipioId: string;
  solicitacaoAt: string | null;
}) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    const formData = new FormData(event.currentTarget);
    const solicitante = formData.get("solicitante");
    const preenchido = typeof solicitante === "string" && solicitante.trim() !== "";

    if (!preenchido && !window.confirm(SOLICITANTE_VAZIO_CONFIRM)) {
      event.preventDefault();
    }
  };

  return (
    <DialogForm action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="municipioId" value={municipioId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Data da solicitação" hint="Opcional, mas recomendado.">
          <input type="date" name="solicitacaoAt" defaultValue={solicitacaoAt ?? todayISO()} className={inputCls} />
        </Field>
        <Field label="Data da habilitação">
          <input type="date" name="habilitadoAt" required defaultValue={todayISO()} className={inputCls} />
        </Field>
        <Field label="Solicitante">
          <input name="solicitante" placeholder="Quem solicitou" className={inputCls} />
        </Field>
        <Field label="Origem da solicitação">
          <select name="origem" className={selectCls} defaultValue="">
            <option value="">—</option>
            {HABILITACAO_ORIGENS.map((origem) => (
              <option key={origem.value} value={origem.value}>
                {origem.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton className={btnXs.replace("h-8", "h-10").replace("text-xs", "text-sm")}>
          Registrar habilitação
        </SubmitButton>
      </div>
    </DialogForm>
  );
}
