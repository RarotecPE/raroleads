import type { ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import {
  Field,
  btnPrimary,
  btnXs,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/ui";
import {
  createBase,
  createDocumento,
  createModulo,
  createProposta,
  setPropostaSituacao,
} from "@/lib/actions";
import {
  BASE_TIPOS,
  DOCUMENTO_TIPOS,
  MODULE_CATALOG,
  PROPOSTA_SITUACOES,
  PROPOSTA_TIPOS,
} from "@/lib/constants";

export function BaseForm({ trigger, municipioId }: { trigger: ReactNode; municipioId: string }) {
  return (
    <Dialog
      trigger={trigger}
      title="Nova base"
      description="Base é a unidade operacional do cliente (Prefeitura, Saúde, Câmara…)."
    >
      <DialogForm action={createBase}>
        <input type="hidden" name="municipioId" value={municipioId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome da base">
            <input name="nome" required className={inputCls} placeholder="Ex.: Secretaria de Saúde" />
          </Field>
          <Field label="Tipo da base">
            <select name="tipo" className={selectCls} defaultValue="Prefeitura">
              {BASE_TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="CNPJ" hint="Quando aplicável.">
            <input name="cnpj" className={inputCls} placeholder="00.000.000/0000-00" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Responsavel">
            <input name="responsavelNome" className={inputCls} placeholder="Nome do responsavel pela base" />
          </Field>
          <Field label="E-mail">
            <input name="responsavelEmail" type="email" className={inputCls} placeholder="responsavel@cliente.gov.br" />
          </Field>
        </div>
        <label className="flex items-start gap-2 text-sm text-app-foreground">
          <input
            type="checkbox"
            name="avisoHabilitacaoEmail"
            defaultChecked
            className="mt-1 h-4 w-4 rounded border-app-border bg-app-surface text-app-primary"
          />
          <span>Enviar aviso de habilitacao por e-mail</span>
        </label>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Cadastrar base</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}

export function ModuloForm({
  trigger,
  baseId,
  municipioId,
}: {
  trigger: ReactNode;
  baseId: string;
  municipioId: string;
}) {
  return (
    <Dialog
      trigger={trigger}
      title="Novo módulo"
      description="Módulo é um produto/sistema disponibilizado dentro da base."
    >
      <DialogForm action={createModulo}>
        <input type="hidden" name="baseId" value={baseId} />
        <input type="hidden" name="municipioId" value={municipioId} />
        <Field label="Nome do módulo" hint="Sugestões do catálogo; texto livre permitido.">
          <input name="nome" required list="catalogo-modulos" className={inputCls} placeholder="Ex.: Contabilidade" />
          <datalist id="catalogo-modulos">
            {MODULE_CATALOG.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Cadastrar módulo</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}

export function PropostaForm({ trigger, municipioId }: { trigger: ReactNode; municipioId: string }) {
  return (
    <Dialog
      trigger={trigger}
      title="Nova proposta"
      description="A proposta representa a origem comercial da relação."
    >
      <DialogForm action={createProposta}>
        <input type="hidden" name="municipioId" value={municipioId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <select name="tipo" className={selectCls} defaultValue="formal">
              {PROPOSTA_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input type="date" name="data" className={inputCls} />
          </Field>
          <Field label="Bases envolvidas">
            <input name="basesEnvolvidas" className={inputCls} placeholder="Prefeitura, Saúde…" />
          </Field>
          <Field label="Módulos envolvidos">
            <input name="modulosEnvolvidos" className={inputCls} placeholder="Contabilidade, RH…" />
          </Field>
        </div>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Registrar proposta</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}

/** Troca rápida de situação da proposta. */
export function PropostaSituacaoForm({ id, situacao }: { id: string; situacao: string }) {
  return (
    <form action={setPropostaSituacao} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`propsit-${id}`}>Situação da proposta</label>
      <select
        id={`propsit-${id}`}
        name="situacao"
        defaultValue={situacao}
        className="h-8 rounded-app-sm border border-app-border bg-app-surface px-2 text-xs text-app-foreground focus-visible:outline-none"
      >
        {PROPOSTA_SITUACOES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <button type="submit" className={btnXs}>Salvar</button>
    </form>
  );
}

export function DocumentoForm({
  trigger,
  municipioId,
  contratoId,
  contratos,
}: {
  trigger: ReactNode;
  municipioId: string;
  contratoId?: string;
  contratos?: { id: string; numero: string }[];
}) {
  return (
    <Dialog
      trigger={trigger}
      title="Anexar documento"
      description="Todo documento deve ter classificação e contexto correto."
    >
      <DialogForm action={createDocumento}>
        <input type="hidden" name="municipioId" value={municipioId} />
        {contratoId ? <input type="hidden" name="contratoId" value={contratoId} /> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo do documento">
            <select name="tipo" className={selectCls} defaultValue="contrato">
              {DOCUMENTO_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Nome do arquivo">
            <input name="nome" required className={inputCls} placeholder="contrato_assinado.pdf" />
          </Field>
          <Field label="Referência" hint="Caminho, link ou identificador do arquivo." className="sm:col-span-2">
            <input name="referencia" className={inputCls} placeholder="/arquivos/contrato_assinado.pdf" />
          </Field>
          {!contratoId && contratos && contratos.length > 0 ? (
            <Field label="Contrato relacionado" className="sm:col-span-2">
              <select name="contratoId" className={selectCls} defaultValue="">
                <option value="">— Sem vínculo —</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>Contrato {c.numero}</option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={botaoClass()}>Anexar documento</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}

function botaoClass() {
  return btnPrimary;
}
