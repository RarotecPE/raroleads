import type { ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { createMunicipio, updateMunicipio } from "@/lib/actions";
import { MUNICIPIO_SITUACOES } from "@/lib/constants";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function MunicipioForm({
  trigger,
  municipio,
}: {
  trigger: ReactNode;
  municipio?: {
    id: string;
    nome: string;
    uf: string;
    codigoIbge: string | null;
    populacao: number | null;
    situacao: string;
    dadosAdministrativos: string | null;
    observacoes: string | null;
  };
}) {
  return (
    <Dialog
      trigger={trigger}
      title={municipio ? "Editar município" : "Novo município"}
      description="O município é o cadastro principal do cliente."
    >
      <DialogForm action={municipio ? updateMunicipio : createMunicipio}>
        {municipio ? <input type="hidden" name="id" value={municipio.id} /> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nome" className="sm:col-span-2">
            <input name="nome" required defaultValue={municipio?.nome ?? ""} className={inputCls} placeholder="Ex.: Tacaratu" />
          </Field>
          <Field label="UF">
            <select name="uf" required defaultValue={municipio?.uf ?? "PE"} className={selectCls}>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </Field>
          <Field label="Código IBGE">
            <input name="codigoIbge" defaultValue={municipio?.codigoIbge ?? ""} className={inputCls} placeholder="2612508" />
          </Field>
          <Field label="População">
            <input name="populacao" type="number" min={0} defaultValue={municipio?.populacao ?? ""} className={inputCls} />
          </Field>
          <Field label="Situação">
            <select name="situacao" required defaultValue={municipio?.situacao ?? "prospect"} className={selectCls}>
              {MUNICIPIO_SITUACOES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Dados administrativos">
          <textarea name="dadosAdministrativos" rows={2} defaultValue={municipio?.dadosAdministrativos ?? ""} className={textareaCls} placeholder="Prefeito(a), contatos, gestão vigente…" />
        </Field>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} defaultValue={municipio?.observacoes ?? ""} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>{municipio ? "Salvar alterações" : "Cadastrar município"}</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
