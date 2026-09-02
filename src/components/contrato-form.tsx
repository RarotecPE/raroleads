import type { ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { FileInput } from "@/components/file-input";
import { Field, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { createContrato } from "@/lib/actions";
import { CONTRATO_MODALIDADES, CONTRATO_SITUACOES, CONTRATO_TIPOS, DOCUMENTO_TIPOS } from "@/lib/constants";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp";

export function ContratoForm({
  trigger,
  municipioId,
  municipios,
  propostas,
}: {
  trigger: ReactNode;
  /** Quando informado, o cliente fica fixo (tela do cliente). */
  municipioId?: string;
  municipios?: { id: string; nome: string }[];
  propostas?: { id: string; tipo: string; data: string | null }[];
}) {
  return (
    <Dialog
      trigger={trigger}
      title="Novo contrato"
      description="Contrato não significa habilitação — vincule módulos na tela do contrato."
      maxWidth="max-w-2xl"
    >
      <DialogForm action={createContrato}>
        {municipioId ? <input type="hidden" name="municipioId" value={municipioId} /> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {!municipioId ? (
            <Field label="Cliente" className="sm:col-span-2">
              <select name="municipioId" required className={selectCls} defaultValue="">
                <option value="" disabled>Selecione…</option>
                {(municipios ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Número do contrato">
            <input name="numero" required className={inputCls} placeholder="001/2026" />
          </Field>
          <Field label="Modalidade">
            <select name="modalidade" className={selectCls} defaultValue="licitacao">
              {CONTRATO_MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Processo">
            <input name="processo" className={inputCls} placeholder="Nº do processo licitatório" />
          </Field>
          <Field label="Situação inicial">
            <select name="situacao" className={selectCls} defaultValue="aguardando_assinatura">
              {CONTRATO_SITUACOES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Data de assinatura">
            <input type="date" name="dataAssinatura" className={inputCls} />
          </Field>
          <Field label="Data inicial">
            <input type="date" name="dataInicio" className={inputCls} />
          </Field>
          <Field label="Data final (vigência)">
            <input type="date" name="dataFim" className={inputCls} />
          </Field>
          {propostas && propostas.length > 0 ? (
            <Field label="Proposta de origem" className="sm:col-span-3">
              <select name="propostaId" className={selectCls} defaultValue="">
                <option value="">— Vincular depois —</option>
                {propostas.map((p) => (
                  <option key={p.id} value={p.id}>{p.tipo} · {p.data ?? "s/ data"}</option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} className={textareaCls} />
        </Field>
        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <p className="text-sm font-semibold text-app-foreground">Anexo do contrato</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo do documento">
              <select name="documentoTipo" className={selectCls} defaultValue="contrato">
                {CONTRATO_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Nome de exibicao">
              <input name="documentoNome" className={inputCls} placeholder="Ex.: Contrato assinado" />
            </Field>
            <Field label="Arquivo" hint="Documentos e imagens ate 20 MB." className="sm:col-span-2">
              <FileInput name="arquivo" accept={FILE_ACCEPT} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Cadastrar contrato</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
