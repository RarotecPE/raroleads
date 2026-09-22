"use client";

import { Send } from "lucide-react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { btnPrimary, btnXs } from "@/components/ui";
import { marcarPropostaEnviada } from "@/lib/proposal-actions";

export function ProposalManualSendDialog({ id }: { id: string }) {
  return <Dialog title="Marcar proposta como enviada" trigger={<button type="button" className={btnXs}><Send className="h-4 w-4" /> Marcar como enviada</button>}>
    <DialogForm action={marcarPropostaEnviada}>
      <input type="hidden" name="id" value={id} />
      <div className="rounded-app-md border border-app-primary/40 bg-app-primary/10 p-4">
        <p className="font-semibold text-app-foreground">Confirma que a proposta foi enviada ao cliente por outro meio?</p>
        <p className="mt-1 text-sm text-app-muted-foreground">O status será alterado para Enviada e as ações de aceitar, recusar ou solicitar retificação serão liberadas.</p>
      </div>
      <div className="flex justify-end"><SubmitButton className={btnPrimary}>Sim, marcar como enviada</SubmitButton></div>
    </DialogForm>
  </Dialog>;
}
