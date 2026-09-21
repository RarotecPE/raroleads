"use client";

import { AlertTriangle, Ban, RotateCcw } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnDanger, btnGhost, btnXs, btnXsGhost, textareaCls } from "@/components/ui";
import { desabilitarBase, reabilitarBase } from "@/lib/actions";

export function BaseStatusActions({
  base,
  childBaseNames,
  moduleCount,
}: {
  base: {
    id: string;
    nome: string;
    situacao: string;
    desabilitacaoOrigemBaseId: string | null;
  };
  childBaseNames: string[];
  moduleCount: number;
}) {
  const [showWarning, setShowWarning] = useState(false);
  const confirmedRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!confirmedRef.current) {
      event.preventDefault();
      setShowWarning(true);
      return;
    }
    confirmedRef.current = false;
  }

  function confirmDisable() {
    confirmedRef.current = true;
    const form = document.getElementById(`disable-base-${base.id}`) as HTMLFormElement | null;
    form?.requestSubmit();
  }

  if (base.situacao !== "ativa") {
    if (base.desabilitacaoOrigemBaseId !== base.id) return null;
    return (
      <form action={reabilitarBase}>
        <input type="hidden" name="id" value={base.id} />
        <SubmitButton className={btnXs}>
          <RotateCcw className="h-3.5 w-3.5" /> Reativar base e módulos
        </SubmitButton>
      </form>
    );
  }

  return (
    <Dialog
      title="Desabilitar base"
      description="A base ficará indisponível para novas operações até ser reativada."
      trigger={
        <button type="button" className={btnXsGhost}>
          <Ban className="h-3.5 w-3.5 text-app-danger" /> Desabilitar
        </button>
      }
    >
      <DialogForm id={`disable-base-${base.id}`} action={desabilitarBase} onSubmit={handleSubmit}>
        <input type="hidden" name="id" value={base.id} />
        <Field label="Motivo da desabilitação">
          <textarea
            name="motivo"
            required
            rows={4}
            className={textareaCls}
            placeholder="Descreva por que a base está sendo desabilitada."
            onChange={() => setShowWarning(false)}
          />
        </Field>

        {showWarning ? (
          <div className="rounded-app-md border border-app-danger/40 bg-app-danger/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" />
              <div>
                <p className="text-sm font-semibold text-app-foreground">Confirme a desabilitação completa</p>
                <p className="mt-1 text-xs text-app-muted-foreground">
                  A base {base.nome}, todos os seus {moduleCount} módulo(s)
                  {childBaseNames.length > 0
                    ? ` e as bases inferiores ${childBaseNames.join(", ")} também serão desabilitados.`
                    : " serão desabilitados."}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setShowWarning(false)}>Cancelar</button>
              <button type="button" className={btnDanger} onClick={confirmDisable}>
                Sim, desabilitar base e módulos
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <SubmitButton className={btnDanger}>Confirmar</SubmitButton>
          </div>
        )}
      </DialogForm>
    </Dialog>
  );
}
