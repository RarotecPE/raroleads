"use client";

import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnPrimary, btnXs, inputCls } from "@/components/ui";
import { setContratoDataAssinatura } from "@/lib/actions";

export function ContratoAssinaturaForm({
  contratoId,
  dataAssinatura,
}: {
  contratoId: string;
  dataAssinatura: string | null;
}) {
  const corrigir = !!dataAssinatura;
  const titulo = corrigir ? "Corrigir data de assinatura" : "Receber assinatura";

  return (
    <Dialog
      title={titulo}
      description="Informe a data em que o contrato foi assinado."
      trigger={<button type="button" className={btnXs.replace("h-8", "h-10")}>{titulo}</button>}
    >
      <DialogForm action={setContratoDataAssinatura}>
        <input type="hidden" name="id" value={contratoId} />
        <Field label="Data de assinatura">
          <input
            type="date"
            name="dataAssinatura"
            aria-label="Data de assinatura"
            defaultValue={dataAssinatura ?? ""}
            required
            className={inputCls}
          />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Salvar data de assinatura</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
