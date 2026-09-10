"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { FileInput } from "@/components/file-input";
import { Badge, Field, btnPrimary, btnXsGhost, inputCls, selectCls, textareaCls } from "@/components/ui";
import { createAditivo } from "@/lib/actions";
import { eligibleAditivoModules, type AditivoModuleOption } from "@/lib/aditivo-modules";
import {
  ADITIVO_TIPO_ALTERACAO_PRAZO,
  ADITIVO_TIPO_EXCLUSAO_MODULO,
  ADITIVO_TIPO_INCLUSAO_MODULO,
  ADITIVO_TIPOS,
  DOCUMENTO_TIPOS,
} from "@/lib/constants";
import { todayISO } from "@/lib/utils";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp";

type AditivoBaseOption = { id: string; nome: string; tipo: string };
export function AditivoForm({
  contratoId,
  dataFimAtual,
  bases,
  modulos,
  linkedModuleIds,
  trigger,
}: {
  contratoId: string;
  dataFimAtual: string | null;
  bases: AditivoBaseOption[];
  modulos: AditivoModuleOption[];
  linkedModuleIds: string[];
  trigger?: ReactNode;
}) {
  const initialTipo = ADITIVO_TIPOS[0]?.value ?? "";
  const [tipo, setTipo] = useState(initialTipo);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const isAlteracaoPrazo = tipo === ADITIVO_TIPO_ALTERACAO_PRAZO;
  const isInclusao = tipo === ADITIVO_TIPO_INCLUSAO_MODULO;
  const isExclusao = tipo === ADITIVO_TIPO_EXCLUSAO_MODULO;
  const isAlteracaoModulos = isInclusao || isExclusao;
  const modulosElegiveis = useMemo(
    () => eligibleAditivoModules(tipo, modulos, linkedModuleIds),
    [linkedModuleIds, modulos, tipo],
  );
  const basesElegiveis = bases.filter((base) => modulosElegiveis.some((modulo) => modulo.baseId === base.id));

  function alterarTipo(novoTipo: string) {
    setTipo(novoTipo);
    setSelecionados(new Set());
  }

  function alternarModulo(moduloId: string, checked: boolean) {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (checked) proximos.add(moduloId);
      else proximos.delete(moduloId);
      return proximos;
    });
  }

  function alternarBase(baseId: string, checked: boolean) {
    const ids = modulosElegiveis.filter((modulo) => modulo.baseId === baseId).map((modulo) => modulo.id);
    setSelecionados((atuais) => {
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
      title="Novo aditivo"
      description="Inclua ou exclua módulos e registre alterações de prazo, valor ou outras condições contratuais."
      maxWidth="max-w-2xl"
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
            <select name="tipo" className={selectCls} value={tipo} onChange={(event) => alterarTipo(event.target.value)}>
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

        {isAlteracaoModulos ? (
          <div className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-app-foreground">
                  Módulos para {isInclusao ? "incluir" : "excluir"}
                </p>
                <p className="mt-0.5 text-xs text-app-muted-foreground">
                  Selecione uma base inteira ou módulos específicos.
                </p>
              </div>
              <Badge tone={isExclusao ? "warning" : "primary"}>{selecionados.size} selecionado(s)</Badge>
            </div>

            {modulosElegiveis.length === 0 ? (
              <div className="mt-3 flex gap-2 rounded-app-md border border-app-warning/40 bg-app-warning/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-app-warning" />
                <div>
                  <p className="text-sm font-semibold text-app-foreground">Nenhum módulo disponível</p>
                  <p className="mt-1 text-xs text-app-muted-foreground">
                    {isInclusao
                      ? "Todos os módulos cadastrados já estão vinculados a este contrato."
                      : "Este contrato ainda não possui módulos vinculados para exclusão."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
                {basesElegiveis.map((base) => {
                  const modulosDaBase = modulosElegiveis.filter((modulo) => modulo.baseId === base.id);
                  const selecionadosNaBase = modulosDaBase.filter((modulo) => selecionados.has(modulo.id)).length;
                  const baseCompleta = selecionadosNaBase === modulosDaBase.length;

                  return (
                    <section key={base.id} className="rounded-app-md border border-app-border bg-app-surface px-3 py-2.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-app-foreground">
                        <input
                          type="checkbox"
                          checked={baseCompleta}
                          onChange={(event) => alternarBase(base.id, event.target.checked)}
                          className="h-4 w-4 rounded border-app-border accent-app-primary"
                        />
                        <span>{base.nome}</span>
                        <span className="text-xs font-normal text-app-muted-foreground">{base.tipo}</span>
                        <span className="ml-auto text-xs font-normal text-app-muted-foreground">
                          {selecionadosNaBase}/{modulosDaBase.length}
                        </span>
                      </label>
                      <div className="mt-2 grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-2">
                        {modulosDaBase.map((modulo) => (
                          <label key={modulo.id} className="flex items-center gap-2 text-sm text-app-muted-foreground">
                            <input
                              type="checkbox"
                              name="baseModuleIds"
                              value={modulo.id}
                              checked={selecionados.has(modulo.id)}
                              onChange={(event) => alternarModulo(modulo.id, event.target.checked)}
                              className="h-4 w-4 rounded border-app-border accent-app-primary"
                            />
                            {modulo.nome}
                          </label>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <Field label="Descrição">
          <textarea
            name="descricao"
            required
            rows={3}
            className={textareaCls}
            placeholder={
              isAlteracaoModulos
                ? "Informe os detalhes e a justificativa da alteração dos módulos."
                : "Descreva as alterações formalizadas pelo aditivo."
            }
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
            <Field label="Nome de exibição">
              <input name="documentoNome" className={inputCls} placeholder="Ex.: Aditivo assinado" />
            </Field>
            <Field label="Arquivo" hint="Obrigatório. Documentos e imagens até 20 MB." className="sm:col-span-2">
              <FileInput name="arquivo" accept={FILE_ACCEPT} required />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary} disabled={isAlteracaoModulos && selecionados.size === 0}>
            Registrar aditivo
          </SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
