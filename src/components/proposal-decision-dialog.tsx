"use client";

import { ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnDanger, btnGhost, btnPrimary, btnXs, textareaCls } from "@/components/ui";
import { decidirProposta } from "@/lib/proposal-actions";

type DecisionStatus = "aceita" | "recusada" | "em_retificacao";

const CONFIG: Record<DecisionStatus, { title: string; icon: ReactNode; reasonRequired: boolean }> = {
  aceita: { title: "Aceitar proposta", icon: <ThumbsUp className="h-4 w-4" />, reasonRequired: false },
  recusada: { title: "Recusar proposta", icon: <ThumbsDown className="h-4 w-4" />, reasonRequired: true },
  em_retificacao: { title: "Solicitar retificação", icon: <Wrench className="h-4 w-4" />, reasonRequired: true },
};

export function ProposalDecisionDialog({ id, status, canCreateRecords = false }: {
  id: string;
  status: DecisionStatus;
  canCreateRecords?: boolean;
}) {
  const config = CONFIG[status];
  const [confirmCreation, setConfirmCreation] = useState(false);
  const [reason, setReason] = useState("");
  const asksForCreation = status === "aceita" && canCreateRecords;

  return <Dialog title={config.title} trigger={<button type="button" className={status === "recusada" ? btnDanger : btnXs}>{config.icon}{config.title}</button>}>
    <DialogForm action={decidirProposta}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {!confirmCreation ? <>
        <Field label={config.reasonRequired ? "Motivo" : "Observação"}><textarea name="motivo" value={reason} onChange={(event) => setReason(event.target.value)} required={config.reasonRequired} rows={3} className={textareaCls} /></Field>
        <div className="flex justify-end"><button type={asksForCreation ? "button" : "submit"} onClick={asksForCreation ? () => setConfirmCreation(true) : undefined} className={status === "recusada" ? btnDanger : btnPrimary}>Confirmar</button></div>
      </> : <div className="space-y-4">
        <input type="hidden" name="motivo" value={reason} />
        <div className="rounded-app-md border border-app-primary/40 bg-app-primary/10 p-4">
          <p className="font-semibold text-app-foreground">Deseja criar agora o cliente, as bases e os módulos vinculados à proposta?</p>
          <p className="mt-1 text-sm text-app-muted-foreground">Cadastros existentes serão reutilizados e somente os itens ausentes serão criados. CNPJ e responsáveis poderão ser preenchidos depois na área de clientes.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost} onClick={() => setConfirmCreation(false)}>Voltar</button>
          <SubmitButton name="criarCadastros" value="nao" className={btnGhost}>Aceitar sem criar</SubmitButton>
          <SubmitButton name="criarCadastros" value="sim" className={btnPrimary}>Aceitar e criar cadastros</SubmitButton>
        </div>
      </div>}
    </DialogForm>
  </Dialog>;
}
