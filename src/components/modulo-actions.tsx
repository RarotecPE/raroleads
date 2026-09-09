"use client";

import { Ban, Check, Play, RotateCcw, Waves } from "lucide-react";
import { selectCls, inputCls, textareaCls, btnXs, btnXsGhost, Field } from "@/components/ui";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { HabilitarModuloForm } from "@/components/habilitar-modulo-form";
import {
  DESABILITACAO_MOTIVOS,
  IMPLANTACAO_STATUS,
} from "@/lib/constants";
import { todayISO } from "@/lib/utils";

export interface ModuloActionsProps {
  id: string;
  municipioId: string;
  habilitadoAt: string | null;
  solicitacaoAt: string | null;
  migracaoInicio: string | null;
  migracaoFim: string | null;
  implantacaoStatus: string;
  execucaoInicio: string | null;
  desabilitadoAt: string | null;
  actions: {
    habilitar: (fd: FormData) => void | Promise<void>;
    migracao: (fd: FormData) => void | Promise<void>;
    implantacao: (fd: FormData) => void | Promise<void>;
    execucao: (fd: FormData) => void | Promise<void>;
    desabilitar: (fd: FormData) => void | Promise<void>;
    reabilitar: (fd: FormData) => void | Promise<void>;
  };
}

/** Ações do ciclo de vida do módulo: habilitar → migrar → implantar → executar → desabilitar. */
export function ModuloActions(m: ModuloActionsProps) {
  const ativo = !m.desabilitadoAt;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ativo && !m.habilitadoAt ? (
        <Dialog
          title="Habilitar módulo"
          description="Registra a solicitação e o momento em que o módulo passa a existir operacionalmente."
          trigger={<button type="button" className={btnXs}>Habilitar</button>}
        >
          <HabilitarModuloForm
            action={m.actions.habilitar}
            id={m.id}
            municipioId={m.municipioId}
            solicitacaoAt={m.solicitacaoAt}
          />
        </Dialog>
      ) : null}

      {ativo && m.habilitadoAt ? (
        <>
          <Dialog
            title="Migração"
            description="Período em que o módulo esteve em processo de migração."
            trigger={
              <button type="button" className={btnXsGhost} title="Migração" aria-label="Migração">
                <Waves className="h-3.5 w-3.5" /> Migração
              </button>
            }
          >
            <DialogForm action={m.actions.migracao}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="municipioId" value={m.municipioId} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Data inicial">
                  <input type="date" name="migracaoInicio" defaultValue={m.migracaoInicio ?? todayISO()} className={inputCls} />
                </Field>
                <Field label="Data final" hint="Deixar vazio marca como em andamento.">
                  <input type="date" name="migracaoFim" defaultValue={m.migracaoFim ?? ""} className={inputCls} />
                </Field>
              </div>
              <div className="flex justify-end">
                <SubmitButton className={btnXs.replace("h-8", "h-10").replace("text-xs", "text-sm")}>Salvar migração</SubmitButton>
              </div>
            </DialogForm>
          </Dialog>

          <form action={m.actions.implantacao} className="flex items-center gap-1">
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="municipioId" value={m.municipioId} />
            <label className="sr-only" htmlFor={`impl-${m.id}`}>Implantação</label>
            <select
              id={`impl-${m.id}`}
              name="implantacaoStatus"
              defaultValue={m.implantacaoStatus}
              className="h-8 rounded-app-sm border border-app-border bg-app-surface px-2 text-xs text-app-foreground focus-visible:outline-none"
            >
              {IMPLANTACAO_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <SubmitButton className={btnXsGhost} aria-label="Salvar implantação" title="Salvar implantação">
              <Check className="h-3.5 w-3.5" />
            </SubmitButton>
          </form>

          {!m.execucaoInicio ? (
            <Dialog
              title="Iniciar execução"
              description="Data em que o cliente iniciou efetivamente a utilização do módulo (diferente da habilitação)."
              trigger={
                <button type="button" className={btnXs} title="Iniciar execução" aria-label="Iniciar execução">
                  <Play className="h-3.5 w-3.5" /> Execução
                </button>
              }
            >
              <DialogForm action={m.actions.execucao}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="municipioId" value={m.municipioId} />
                <Field label="Data inicial de utilização">
                  <input type="date" name="execucaoInicio" required defaultValue={todayISO()} className={inputCls} />
                </Field>
                <div className="flex justify-end">
                  <SubmitButton className={btnXs.replace("h-8", "h-10").replace("text-xs", "text-sm")}>Registrar execução</SubmitButton>
                </div>
              </DialogForm>
            </Dialog>
          ) : null}

          <Dialog
            title="Desabilitar módulo"
            description="O histórico anterior nunca é apagado — a desativação vira um evento."
            trigger={
              <button type="button" className={btnXsGhost} title="Desabilitar" aria-label="Desabilitar">
                <Ban className="h-3.5 w-3.5 text-app-danger" /> Desabilitar
              </button>
            }
          >
            <DialogForm action={m.actions.desabilitar}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="municipioId" value={m.municipioId} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Data">
                  <input type="date" name="data" required defaultValue={todayISO()} className={inputCls} />
                </Field>
                <Field label="Motivo">
                  <select name="motivo" required className={selectCls} defaultValue="">
                    <option value="" disabled>Selecione…</option>
                    {DESABILITACAO_MOTIVOS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Justificativa">
                <textarea name="justificativa" required rows={3} className={textareaCls} placeholder="Por que o módulo está sendo desabilitado?" />
              </Field>
              <div className="flex justify-end">
                <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-danger px-4 text-sm font-semibold text-app-primary-foreground transition-colors hover:brightness-110">Desabilitar</SubmitButton>
              </div>
            </DialogForm>
          </Dialog>
        </>
      ) : null}

      {!ativo ? (
        <form action={m.actions.reabilitar}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="municipioId" value={m.municipioId} />
          <SubmitButton className={btnXs}>
            <RotateCcw className="h-3.5 w-3.5" /> Reabilitar
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
