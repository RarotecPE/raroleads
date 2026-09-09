"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { FileInput } from "@/components/file-input";
import { Field, btnPrimary, btnXsGhost, inputCls, selectCls, textareaCls } from "@/components/ui";
import { createAditivo } from "@/lib/actions";
import { ADITIVO_TIPO_ALTERACAO_PRAZO, ADITIVO_TIPOS, DOCUMENTO_TIPOS } from "@/lib/constants";
import { todayISO } from "@/lib/utils";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp";

export function AditivoForm({
  contratoId,
  dataFimAtual,
  trigger,
}: {
  contratoId: string;
  dataFimAtual: string | null;
  trigger?: ReactNode;
}) {
  const initialTipo = ADITIVO_TIPOS[0]?.value ?? "";
  const [tipo, setTipo] = useState(initialTipo);
  const isAlteracaoPrazo = tipo === ADITIVO_TIPO_ALTERACAO_PRAZO;

  return (
    <Dialog
      title="Novo aditivo"
      description="Inclusão/exclusão de módulo, prazo, valor ou alteração contratual."
      trigger={
        trigger ?? (
          <button type="button" className={btnXsGhost}>
            <Plus className="h-3.5 w-3.5" /> Novo
          </button>
        )
      }
    >
      <DialogForm action={createAditivo}>
        <input type="hidden" name="contratoId" value={contratoId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <select name="tipo" className={selectCls} value={tipo} onChange={(event) => setTipo(event.target.value)}>
              {ADITIVO_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input type="date" name="data" defaultValue={todayISO()} className={inputCls} />
          </Field>
          {isAlteracaoPrazo ? (
            <Field label="Nova data final" className="sm:col-span-2">
              <input type="date" name="novaDataFim" defaultValue={dataFimAtual ?? ""} required className={inputCls} />
            </Field>
          ) : null}
        </div>
        <Field label="Descrição">
          <textarea
            name="descricao"
            required
            rows={3}
            className={textareaCls}
            placeholder="Ex.: Inclusão do módulo Portal na base Prefeitura."
          />
        </Field>
        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <p className="text-sm font-semibold text-app-foreground">Anexo do aditivo</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo do documento">
              <select name="documentoTipo" className={selectCls} defaultValue="aditivo">
                {DOCUMENTO_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome de exibicao">
              <input name="documentoNome" className={inputCls} placeholder="Ex.: Aditivo assinado" />
            </Field>
            <Field label="Arquivo" hint="Documentos e imagens ate 20 MB." className="sm:col-span-2">
              <FileInput name="arquivo" accept={FILE_ACCEPT} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Registrar aditivo</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
