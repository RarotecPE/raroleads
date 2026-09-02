"use client";

import { useRef, useState, type FormEvent } from "react";
import { CnpjInput } from "@/components/cnpj-input";
import { DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnGhost, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { BASE_TIPOS } from "@/lib/constants";

interface BaseOption {
  id: string;
  tipo: string;
}

interface EditableBase {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  observacoes: string | null;
}

interface BaseFormFieldsProps {
  action: (fd: FormData) => void | Promise<void>;
  municipioId: string;
  existingBases: BaseOption[];
  base?: EditableBase;
}

export function BaseFormFields({
  action,
  municipioId,
  existingBases,
  base,
}: BaseFormFieldsProps) {
  const confirmedDuplicateRef = useRef(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const isEdit = !!base;

  function hasDuplicateType(form: HTMLFormElement) {
    const formData = new FormData(form);
    const tipo = formData.get("tipo");
    if (typeof tipo !== "string" || tipo.trim() === "") return false;
    return existingBases.some((item) => item.tipo === tipo && item.id !== base?.id);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!confirmedDuplicateRef.current && hasDuplicateType(event.currentTarget)) {
      event.preventDefault();
      setShowDuplicateWarning(true);
      return;
    }

    confirmedDuplicateRef.current = false;
  }

  function handleConfirmDuplicate() {
    confirmedDuplicateRef.current = true;
    const form = document.getElementById(`base-form-${base?.id ?? "new"}`) as HTMLFormElement | null;
    form?.requestSubmit();
  }

  return (
    <DialogForm id={`base-form-${base?.id ?? "new"}`} action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="municipioId" value={municipioId} />
      {base ? <input type="hidden" name="id" value={base.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome da base">
          <input
            name="nome"
            required
            defaultValue={base?.nome ?? ""}
            className={inputCls}
            placeholder="Ex.: Secretaria de Saude"
          />
        </Field>
        <Field label="Tipo da base">
          <select name="tipo" className={selectCls} defaultValue={base?.tipo ?? "Prefeitura"}>
            {BASE_TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="CNPJ" hint="Quando aplicavel.">
          <CnpjInput name="cnpj" defaultValue={base?.cnpj} placeholder="00.000.000/0000-00" />
        </Field>
      </div>
      <Field label="Observacoes">
        <textarea name="observacoes" rows={2} defaultValue={base?.observacoes ?? ""} className={textareaCls} />
      </Field>
      {showDuplicateWarning ? (
        <div className="rounded-app-md border border-app-warning/40 bg-app-warning/10 p-3">
          <p className="text-sm font-semibold text-app-foreground">Tipo de base ja cadastrado</p>
          <p className="mt-1 text-xs text-app-muted-foreground">
            Para este cliente ja existe uma base com este tipo. Deseja realmente {isEdit ? "salvar" : "cadastrar"} outra base do mesmo tipo?
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setShowDuplicateWarning(false)}>
              Cancelar
            </button>
            <button type="button" className={btnPrimary} onClick={handleConfirmDuplicate}>
              Confirmar
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton className={btnPrimary}>{isEdit ? "Salvar base" : "Cadastrar base"}</SubmitButton>
      </div>
    </DialogForm>
  );
}
