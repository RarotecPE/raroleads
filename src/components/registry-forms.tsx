"use client";

import { useState, type FormEventHandler, type ReactNode } from "react";
import { BaseFormFields } from "@/components/base-form-fields";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { FileInput } from "@/components/file-input";
import { PhoneInput } from "@/components/phone-input";
import {
  Field,
  btnDanger,
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
  createResponsavelModulo,
  deleteResponsavelModulo,
  desvincularBaseSuperior,
  updateBase,
  updateResponsavelModulo,
} from "@/lib/actions";
import {
  DOCUMENTO_TIPOS,
  MODULE_CATALOG,
} from "@/lib/constants";
import { norm } from "@/lib/utils";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp";

interface BaseFormBase {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  observacoes: string | null;
  baseSuperiorId: string | null;
}

export function BaseForm({
  trigger,
  municipioId,
  bases = [],
  base,
}: {
  trigger: ReactNode;
  municipioId: string;
  bases?: BaseFormBase[];
  base?: BaseFormBase;
}) {
  const isEdit = !!base;
  return (
    <Dialog
      trigger={trigger}
      title={isEdit ? "Editar base" : "Nova base"}
      description="Base é a unidade operacional do cliente (Prefeitura, Saúde, Câmara…)."
      maxWidth="max-w-3xl"
    >
      <BaseFormFields
        action={isEdit ? updateBase : createBase}
        municipioId={municipioId}
        existingBases={bases.map((item) => ({ id: item.id, nome: item.nome, tipo: item.tipo, baseSuperiorId: item.baseSuperiorId }))}
        base={base}
      />
      {base?.baseSuperiorId ? (
        <DialogForm action={desvincularBaseSuperior} className="mt-5 border-t border-app-border pt-4">
          <input type="hidden" name="id" value={base.id} />
          <p className="text-xs text-app-muted-foreground">Desvincule esta base antes de associá-la a outra superior.</p>
          <div className="flex justify-end"><SubmitButton className={btnXs}>Desvincular da base superior</SubmitButton></div>
        </DialogForm>
      ) : null}
    </Dialog>
  );
}

export function ModuloForm({
  trigger,
  baseId,
  municipioId,
  modulos = [],
  hasChildBases = false,
}: {
  trigger: ReactNode;
  baseId: string;
  municipioId: string;
  modulos?: { nome: string }[];
  hasChildBases?: boolean;
}) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    const formData = new FormData(event.currentTarget);
    const nome = formData.get("nome");
    const normalizedNome = typeof nome === "string" ? norm(nome) : "";
    const exists = !!normalizedNome && modulos.some((modulo) => norm(modulo.nome) === normalizedNome);

    if (exists) {
      event.preventDefault();
      window.alert("Módulo já vinculado a base!");
    }
  };

  return (
    <Dialog
      trigger={trigger}
      title="Novo módulo"
      description="Módulo é um produto/sistema disponibilizado dentro da base."
    >
      <DialogForm action={createModulo} onSubmit={handleSubmit}>
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
        {hasChildBases ? (
          <label className="flex items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3 text-sm text-app-foreground">
            <input type="checkbox" name="replicarInferiores" className="h-4 w-4 accent-app-primary" />
            Replicar para bases inferiores
          </label>
        ) : null}
        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <p className="text-sm font-semibold text-app-foreground">Responsável</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <input name="responsavelNome" className={inputCls} placeholder="Nome do responsável" />
            </Field>
            <Field label="E-mail">
              <input name="responsavelEmail" type="email" className={inputCls} placeholder="responsavel@cliente.gov.br" />
            </Field>
            <Field label="Celular">
              <PhoneInput name="responsavelCelular" placeholder="(00)99999-9999" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Cadastrar módulo</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}

export function ResponsavelModuloForm({
  trigger,
  municipioId,
  modulos,
  responsavel,
}: {
  trigger: ReactNode;
  municipioId: string;
  modulos: { id: string; nome: string; baseNome: string }[];
  responsavel?: {
    id: string;
    baseModuleId: string;
    nome: string;
    email: string | null;
    celular: string | null;
  };
}) {
  const isEdit = !!responsavel;
  return (
    <Dialog
      trigger={trigger}
      title={isEdit ? "Editar responsavel" : "Novo responsavel"}
      description={isEdit ? "Atualize os dados de contato do responsavel." : "Vincule um responsavel a um modulo do cliente."}
    >
      <DialogForm action={isEdit ? updateResponsavelModulo : createResponsavelModulo}>
        <input type="hidden" name="municipioId" value={municipioId} />
        {responsavel ? (
          <>
            <input type="hidden" name="id" value={responsavel.id} />
            <input type="hidden" name="baseModuleId" value={responsavel.baseModuleId} />
          </>
        ) : (
          <Field label="Modulo">
            <select name="baseModuleId" required className={selectCls} defaultValue="">
              <option value="" disabled>Selecione...</option>
              {modulos.map((modulo) => (
                <option key={modulo.id} value={modulo.id}>{modulo.baseNome} - {modulo.nome}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input name="nome" required defaultValue={responsavel?.nome ?? ""} className={inputCls} placeholder="Nome do responsavel" />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" defaultValue={responsavel?.email ?? ""} className={inputCls} placeholder="responsavel@cliente.gov.br" />
          </Field>
          <Field label="Celular">
            <PhoneInput name="celular" defaultValue={responsavel?.celular} placeholder="(00)99999-9999" />
          </Field>
        </div>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>{isEdit ? "Salvar responsavel" : "Cadastrar responsavel"}</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}

export function DeleteResponsavelModuloForm({
  trigger,
  responsavel,
}: {
  trigger: ReactNode;
  responsavel: { id: string; municipioId: string; baseModuleId: string; nome: string };
}) {
  return (
    <Dialog
      trigger={trigger}
      title="Deletar responsavel"
      description="Esta acao remove o responsavel e desfaz o vinculo com o modulo correspondente."
    >
      <DialogForm action={deleteResponsavelModulo}>
        <input type="hidden" name="id" value={responsavel.id} />
        <input type="hidden" name="municipioId" value={responsavel.municipioId} />
        <input type="hidden" name="baseModuleId" value={responsavel.baseModuleId} />
        <input type="hidden" name="nome" value={responsavel.nome} />
        <p className="text-sm text-app-muted-foreground">
          Deseja realmente deletar {responsavel.nome}? Ao deletar, ele sera desvinculado do modulo.
        </p>
        <div className="flex justify-end">
          <SubmitButton className={btnDanger}>Deletar responsavel</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
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
  const [selectedContractId, setSelectedContractId] = useState(contratoId ?? "");
  return (
    <Dialog
      trigger={trigger}
      title="Anexar documento"
      description="Anexe um arquivo ao cliente ou a um contrato."
    >
      <DialogForm action={createDocumento}>
        <input type="hidden" name="municipioId" value={municipioId} />
        {contratoId ? <input type="hidden" name="contratoId" value={contratoId} /> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedContractId ? (
            <Field label="Tipo do documento"><p className="py-2 text-sm text-app-foreground">Contrato</p></Field>
          ) : (
            <Field label="Tipo do documento">
              <select name="tipo" className={selectCls} defaultValue="Contrato">
                {DOCUMENTO_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          )}
          {selectedContractId ? null : (
            <Field label="Nome do arquivo">
              <input name="nome" className={inputCls} placeholder="documento.pdf" />
            </Field>
          )}
          <Field label="Arquivo" hint="Documentos e imagens ate 20 MB." className="sm:col-span-2">
            <FileInput name="arquivo" required accept={FILE_ACCEPT} />
          </Field>
          <Field label="Referência" hint="Opcional para documentos legados ou observacoes externas." className="sm:col-span-2">
            <input name="referencia" className={inputCls} placeholder="/arquivos/documento.pdf" />
          </Field>
          {!contratoId && contratos && contratos.length > 0 ? (
            <Field label="Contrato relacionado" className="sm:col-span-2">
              <select name="contratoId" className={selectCls} value={selectedContractId} onChange={(event) => setSelectedContractId(event.target.value)}>
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
