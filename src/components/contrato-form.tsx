"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { FileInput } from "@/components/file-input";
import { Badge, Empty, Field, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { createContrato } from "@/lib/actions";
import { CONTRATO_MODALIDADES, CONTRATO_SITUACOES, CONTRATO_TIPOS } from "@/lib/constants";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp";

type ContratoBaseOption = {
  id: string;
  municipioId: string;
  nome: string;
  tipo: string;
};

type ContratoModuloOption = {
  id: string;
  baseId: string;
  nome: string;
};

export function ContratoForm({
  trigger,
  municipioId,
  municipios,
  propostas,
  bases = [],
  modulos = [],
}: {
  trigger: ReactNode;
  /** Quando informado, o cliente fica fixo (tela do cliente). */
  municipioId?: string;
  municipios?: { id: string; nome: string }[];
  propostas?: { id: string; tipo: string; data: string | null }[];
  bases?: ContratoBaseOption[];
  modulos?: ContratoModuloOption[];
}) {
  const [clienteSelecionado, setClienteSelecionado] = useState(municipioId ?? "");
  const [modulosSelecionados, setModulosSelecionados] = useState<Set<string>>(new Set());

  const basesDoCliente = useMemo(
    () => bases.filter((base) => base.municipioId === clienteSelecionado),
    [bases, clienteSelecionado],
  );
  const baseIds = useMemo(() => new Set(basesDoCliente.map((base) => base.id)), [basesDoCliente]);
  const modulosDoCliente = useMemo(
    () => modulos.filter((modulo) => baseIds.has(modulo.baseId)),
    [baseIds, modulos],
  );
  const clienteSemBase = !!clienteSelecionado && basesDoCliente.length === 0;

  function selecionarCliente(id: string) {
    setClienteSelecionado(id);
    setModulosSelecionados(new Set());
  }

  function alternarModulo(moduloId: string, checked: boolean) {
    setModulosSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (checked) proximos.add(moduloId);
      else proximos.delete(moduloId);
      return proximos;
    });
  }

  function alternarBase(baseId: string, checked: boolean) {
    const ids = modulosDoCliente.filter((modulo) => modulo.baseId === baseId).map((modulo) => modulo.id);
    setModulosSelecionados((atuais) => {
      const proximos = new Set(atuais);
      for (const id of ids) {
        if (checked) proximos.add(id);
        else proximos.delete(id);
      }
      return proximos;
    });
  }

  return (
    <Dialog
      trigger={trigger}
      title="Novo contrato"
      description="Cadastre o contrato e defina as bases e módulos contemplados."
      maxWidth="max-w-3xl"
    >
      <DialogForm action={createContrato}>
        {municipioId ? <input type="hidden" name="municipioId" value={municipioId} /> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {!municipioId ? (
            <Field label="Cliente" className="sm:col-span-2">
              <select
                name="municipioId"
                required
                className={selectCls}
                value={clienteSelecionado}
                onChange={(event) => selecionarCliente(event.target.value)}
              >
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app-foreground">Bases e módulos contemplados</p>
              <p className="mt-0.5 text-xs text-app-muted-foreground">Selecione uma base inteira ou apenas os módulos cobertos.</p>
            </div>
            {clienteSelecionado && !clienteSemBase ? (
              <Badge tone="primary">{modulosSelecionados.size} selecionado(s)</Badge>
            ) : null}
          </div>

          {!clienteSelecionado ? (
            <div className="mt-3">
              <Empty title="Selecione um cliente" description="As bases e os módulos cadastrados aparecerão aqui." />
            </div>
          ) : clienteSemBase ? (
            <div className="mt-3 flex gap-2 rounded-app-md border border-app-warning/40 bg-app-warning/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-app-warning" />
              <div>
                <p className="text-sm font-semibold text-app-foreground">Cliente sem base cadastrada</p>
                <p className="mt-1 text-xs text-app-muted-foreground">
                  O cliente não possui base cadastrada para serem vinculadas ao contrato. Cadastre uma base antes de criar o contrato.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
              {basesDoCliente.map((base) => {
                const modulosDaBase = modulosDoCliente.filter((modulo) => modulo.baseId === base.id);
                const selecionadosNaBase = modulosDaBase.filter((modulo) => modulosSelecionados.has(modulo.id)).length;
                const baseCompleta = modulosDaBase.length > 0 && selecionadosNaBase === modulosDaBase.length;

                return (
                  <section key={base.id} className="rounded-app-md border border-app-border bg-app-surface px-3 py-2.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-app-foreground">
                      <input
                        type="checkbox"
                        checked={baseCompleta}
                        disabled={modulosDaBase.length === 0}
                        onChange={(event) => alternarBase(base.id, event.target.checked)}
                        className="h-4 w-4 rounded border-app-border accent-app-primary"
                      />
                      <span>{base.nome}</span>
                      <span className="text-xs font-normal text-app-muted-foreground">{base.tipo}</span>
                      {modulosDaBase.length > 0 ? (
                        <span className="ml-auto text-xs font-normal text-app-muted-foreground">
                          {selecionadosNaBase}/{modulosDaBase.length}
                        </span>
                      ) : null}
                    </label>
                    {modulosDaBase.length === 0 ? (
                      <p className="mt-2 pl-6 text-xs text-app-warning">Esta base ainda não possui módulos cadastrados.</p>
                    ) : (
                      <div className="mt-2 grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-2">
                        {modulosDaBase.map((modulo) => (
                          <label key={modulo.id} className="flex items-center gap-2 text-sm text-app-muted-foreground">
                            <input
                              type="checkbox"
                              name="baseModuleIds"
                              value={modulo.id}
                              checked={modulosSelecionados.has(modulo.id)}
                              onChange={(event) => alternarModulo(modulo.id, event.target.checked)}
                              className="h-4 w-4 rounded border-app-border accent-app-primary"
                            />
                            {modulo.nome}
                          </label>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

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
            <Field label="Nome de exibição">
              <input name="documentoNome" className={inputCls} placeholder="Ex.: Contrato assinado" />
            </Field>
            <Field label="Arquivo" hint="Obrigatório. Documentos e imagens até 20 MB." className="sm:col-span-2">
              <FileInput name="arquivo" accept={FILE_ACCEPT} required />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary} disabled={clienteSemBase}>Cadastrar contrato</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
