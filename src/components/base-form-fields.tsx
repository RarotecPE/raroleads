"use client";

import { useRef, useState, type FormEvent } from "react";
import { CnpjInput } from "@/components/cnpj-input";
import { DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnGhost, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { BASE_TIPOS } from "@/lib/constants";
import { cnpjDigits, formatCnpj } from "@/lib/cnpj";

interface BaseOption {
  id: string;
  nome: string;
  tipo: string;
  baseSuperiorId: string | null;
}

interface EditableBase {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  observacoes: string | null;
  baseSuperiorId: string | null;
}

type ChildDraft = { key: string; nome: string; tipo: string; cnpj: string; observacoes: string };
const emptyChildDraft = (): ChildDraft => ({ key: crypto.randomUUID(), nome: "", tipo: BASE_TIPOS[0], cnpj: "", observacoes: "" });

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
  const [children, setChildren] = useState<ChildDraft[]>([]);
  const [draft, setDraft] = useState<ChildDraft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const isEdit = !!base;
  const canAddChildren = !base?.baseSuperiorId;
  const linkedChildren = base ? existingBases.filter((item) => item.baseSuperiorId === base.id) : [];
  const attachableBases = existingBases.filter((item) =>
    item.id !== base?.id && !item.baseSuperiorId && !existingBases.some((other) => other.baseSuperiorId === item.id),
  );

  function hasDuplicateType(form: HTMLFormElement) {
    const formData = new FormData(form);
    const tipo = formData.get("tipo");
    if (typeof tipo !== "string" || tipo.trim() === "") return false;
    return existingBases.some((item) => item.tipo === tipo && item.id !== base?.id);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (draft) {
      event.preventDefault();
      window.alert("Conclua ou cancele o cadastro da base inferior antes de salvar.");
      return;
    }
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

  function saveDraft() {
    if (!draft?.nome.trim() || !draft.tipo.trim()) {
      window.alert("Informe nome e tipo da base inferior.");
      return;
    }
    const duplicate = existingBases.some((item) => item.tipo === draft.tipo) ||
      children.some((item, index) => index !== editingIndex && item.tipo === draft.tipo);
    if (duplicate && !window.confirm("Este tipo de base já está cadastrado para o cliente. Deseja continuar?")) return;
    const next = { ...draft, nome: draft.nome.trim(), observacoes: draft.observacoes.trim() };
    setChildren((current) => editingIndex === null ? [...current, next] : current.map((item, index) => index === editingIndex ? next : item));
    setDraft(null);
    setEditingIndex(null);
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
      {canAddChildren ? (
        <section className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-app-foreground">Bases inferiores</p>
              {linkedChildren.length > 0 ? <p className="text-xs text-app-muted-foreground">Já vinculadas: {linkedChildren.map((item) => item.nome).join(", ")}</p> : null}
            </div>
            <button type="button" className={btnGhost} disabled={!!draft} onClick={() => { setDraft(emptyChildDraft()); setEditingIndex(null); }}>
              Adicionar base inferior
            </button>
          </div>
          <input type="hidden" name="inferioresNovas" value={JSON.stringify(children.map(({ nome, tipo, cnpj, observacoes }) => ({ nome, tipo, cnpj, observacoes })))} />
          {children.length > 0 ? (
            <div className="mt-3 space-y-2">
              {children.map((child, index) => (
                <div key={child.key} className="flex items-center justify-between gap-2 rounded-app-sm border border-app-border bg-app-surface px-3 py-2 text-sm">
                  <span>{child.nome} <span className="text-app-muted-foreground">· {child.tipo}</span></span>
                  <span className="flex gap-2">
                    <button type="button" className={btnGhost} onClick={() => { setDraft(child); setEditingIndex(index); }}>Editar</button>
                    <button type="button" className={btnGhost} onClick={() => setChildren((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {draft ? (
            <div className="mt-3 space-y-3 rounded-app-md border border-app-border bg-app-surface p-3">
              <p className="text-sm font-semibold text-app-foreground">{editingIndex === null ? "Nova base inferior" : "Editar base inferior"}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nome da base"><input value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} className={inputCls} /></Field>
                <Field label="Tipo da base">
                  <select value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value })} className={selectCls}>
                    {BASE_TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </Field>
                <Field label="CNPJ" hint="Quando aplicável.">
                  <input value={formatCnpj(draft.cnpj)} onChange={(event) => setDraft({ ...draft, cnpj: cnpjDigits(event.target.value) })} inputMode="numeric" maxLength={18} className={inputCls} />
                </Field>
              </div>
              <Field label="Observações"><textarea value={draft.observacoes} onChange={(event) => setDraft({ ...draft, observacoes: event.target.value })} rows={2} className={textareaCls} /></Field>
              <div className="flex justify-end gap-2">
                <button type="button" className={btnGhost} onClick={() => { setDraft(null); setEditingIndex(null); }}>Cancelar</button>
                <button type="button" className={btnPrimary} onClick={saveDraft}>Adicionar à lista</button>
              </div>
            </div>
          ) : null}
          {attachableBases.length > 0 ? (
            <div className="mt-4 border-t border-app-border pt-3">
              <p className="text-sm font-semibold text-app-foreground">Vincular bases já cadastradas</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {attachableBases.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-app-foreground">
                    <input type="checkbox" name="inferioresExistentesIds" value={item.id} className="h-4 w-4 accent-app-primary" />
                    {item.nome} <span className="text-xs text-app-muted-foreground">{item.tipo}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
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
