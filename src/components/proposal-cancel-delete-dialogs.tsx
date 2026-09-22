"use client";

import { Ban, Trash2 } from "lucide-react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnDanger, btnGhost, btnPrimary, textareaCls } from "@/components/ui";
import { cancelarProposta, excluirProposta } from "@/lib/proposal-actions";

export function ProposalCancelDialog({ id }: { id: string }) {
  return <Dialog
    title="Cancelar proposta"
    description="O cancelamento é definitivo e só está disponível durante a solicitação."
    trigger={<button type="button" className={btnGhost}><Ban className="h-4 w-4" /> Cancelar proposta</button>}
  >
    <DialogForm action={cancelarProposta}>
      <input type="hidden" name="id" value={id} />
      <Field label="Motivo do cancelamento">
        <textarea name="motivo" required rows={4} className={textareaCls} placeholder="Descreva por que a proposta está sendo cancelada" />
      </Field>
      <div className="flex justify-end"><SubmitButton className={btnPrimary}>Confirmar cancelamento</SubmitButton></div>
    </DialogForm>
  </Dialog>;
}

export function ProposalDeleteDialog({ id }: { id: string }) {
  return <Dialog
    title="Excluir proposta"
    description="Esta ação não poderá ser desfeita pela aplicação."
    trigger={<button type="button" className={btnDanger}><Trash2 className="h-4 w-4" /> Excluir proposta</button>}
  >
    <DialogForm action={excluirProposta}>
      <input type="hidden" name="id" value={id} />
      <div className="rounded-app-md border border-app-danger/40 bg-app-danger/10 p-4">
        <p className="font-semibold text-app-foreground">A proposta desaparecerá de todas as telas.</p>
        <p className="mt-1 text-sm text-app-muted-foreground">O registro completo, o escopo e o histórico continuarão armazenados no banco para auditoria.</p>
      </div>
      <div className="flex justify-end"><SubmitButton className={btnDanger}>Sim, excluir proposta</SubmitButton></div>
    </DialogForm>
  </Dialog>;
}
