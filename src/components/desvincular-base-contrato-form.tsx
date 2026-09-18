"use client";

import { Link2Off } from "lucide-react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnXsGhost, selectCls, textareaCls } from "@/components/ui";
import { desvincularBaseContrato } from "@/lib/actions";
import { CONTRACT_UNLINK_REASONS } from "@/lib/contract-reference";

export function DesvincularBaseContratoForm({ contratoId, baseId, baseNome }: {
  contratoId: string;
  baseId: string;
  baseNome: string;
}) {
  return (
    <Dialog
      trigger={<button type="button" className={btnXsGhost}><Link2Off className="h-3.5 w-3.5" /> Desvincular base</button>}
      title={`Desvincular ${baseNome}`}
      description="Todos os módulos desta base serão liberados para outro contrato. A ação ficará no histórico."
    >
      <DialogForm action={desvincularBaseContrato}>
        <input type="hidden" name="contratoId" value={contratoId} />
        <input type="hidden" name="baseId" value={baseId} />
        <Field label="Motivo">
          <select name="motivo" required defaultValue="" className={selectCls}>
            <option value="" disabled>Selecione um motivo</option>
            {CONTRACT_UNLINK_REASONS.map((motivo) => <option key={motivo} value={motivo}>{motivo}</option>)}
          </select>
        </Field>
        <Field label="Observações" hint="Opcional. Descreva o contexto da desvinculação.">
          <textarea name="observacoes" rows={3} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnXsGhost}>Confirmar desvinculação</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
