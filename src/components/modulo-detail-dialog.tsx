import Link from "next/link";
import type { ReactNode } from "react";
import { Ban, FileText, Mail, Phone, Play, RotateCcw, Waves } from "lucide-react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { ImplantacaoStatusForm } from "@/components/implantacao-status-form";
import { Badge, Empty, Field, YesNo, btnXs, btnXsGhost, inputCls, selectCls, textareaCls } from "@/components/ui";
import type { Base, BaseModule, Contrato, ModuloState } from "@/lib/domain";
import { contratoView } from "@/lib/domain";
import { DESABILITACAO_MOTIVOS, HABILITACAO_ORIGENS, optLabel } from "@/lib/constants";
import { formatDate, formatDateTime, todayISO } from "@/lib/utils";
import type { moduloResponsaveis } from "@/db/schema";

type ModuloResponsavel = typeof moduloResponsaveis.$inferSelect;
type ModuloActions = {
  habilitar: (fd: FormData) => void | Promise<void>;
  migracao: (fd: FormData) => void | Promise<void>;
  implantacao: (fd: FormData) => void | Promise<void>;
  execucao: (fd: FormData) => void | Promise<void>;
  desabilitar: (fd: FormData) => void | Promise<void>;
  reabilitar: (fd: FormData) => void | Promise<void>;
};

interface ModuloDetailDialogProps {
  modulo: BaseModule;
  base: Base;
  municipioId: string;
  state: ModuloState;
  contratado: boolean;
  contratos: Contrato[];
  responsaveis: ModuloResponsavel[];
  actions: ModuloActions;
}

export function ModuloDetailDialog({
  modulo,
  base,
  municipioId,
  state,
  contratado,
  contratos,
  responsaveis,
  actions,
}: ModuloDetailDialogProps) {
  const ativo = !modulo.desabilitadoAt;
  const habilitado = !!modulo.habilitadoAt;

  return (
    <Dialog
      title={modulo.nome}
      description={`${base.nome} - ${base.tipo}`}
      maxWidth="max-w-3xl"
      trigger={
        <button
          type="button"
          className="text-left text-sm font-semibold text-app-foreground underline-offset-4 transition-colors hover:text-app-primary hover:underline"
        >
          {modulo.nome}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={state.tone}>{state.label}</Badge>
            <Badge tone="muted">{modulo.tipo}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <YesNo yes={contratado} label="Contrato" />
            <YesNo yes={!!modulo.habilitadoAt && !modulo.desabilitadoAt} label="Habilitado" />
            <YesNo yes={!!modulo.execucaoInicio && !modulo.desabilitadoAt} label="Execucao" />
          </div>
        </div>

        <section className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <h3 className="text-sm font-bold text-app-foreground">Detalhes operacionais</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Solicitacao" value={modulo.solicitacaoAt ? formatDate(modulo.solicitacaoAt) : "Não informada"} />
            <Detail label="Solicitante" value={modulo.solicitante ?? "Não informado"} />
            <Detail label="Origem" value={optLabel(modulo.solicitacaoOrigem)} />
            <DetailAction
              label="Habilitacao"
              value={modulo.habilitadoAt ? formatDate(modulo.habilitadoAt) : "Não habilitado"}
              action={ativo && !habilitado ? (
                <Dialog
                  title="Habilitar módulo"
                  description="Registra a solicitação e o momento em que o módulo passa a existir operacionalmente."
                  trigger={<button type="button" className={btnXs}>Habilitar</button>}
                >
                  <DialogForm action={actions.habilitar}>
                    <input type="hidden" name="id" value={modulo.id} />
                    <input type="hidden" name="municipioId" value={municipioId} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Data da solicitação" hint="Opcional, mas recomendado.">
                        <input type="date" name="solicitacaoAt" defaultValue={modulo.solicitacaoAt ?? todayISO()} className={inputCls} />
                      </Field>
                      <Field label="Data da habilitação">
                        <input type="date" name="habilitadoAt" required defaultValue={todayISO()} className={inputCls} />
                      </Field>
                      <Field label="Solicitante">
                        <input name="solicitante" placeholder="Quem solicitou" className={inputCls} />
                      </Field>
                      <Field label="Origem da solicitação">
                        <select name="origem" className={selectCls} defaultValue="">
                          <option value="">—</option>
                          {HABILITACAO_ORIGENS.map((origem) => (
                            <option key={origem.value} value={origem.value}>{origem.label}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton className={btnXs.replace("h-8", "h-10").replace("text-xs", "text-sm")}>Registrar habilitação</SubmitButton>
                    </div>
                  </DialogForm>
                </Dialog>
              ) : null}
            />
            <DetailAction
              label="Migracao"
              value={
                modulo.migracaoInicio
                  ? `${formatDate(modulo.migracaoInicio)} -> ${
                      modulo.migracaoFim ? formatDate(modulo.migracaoFim) : "em andamento"
                    }`
                  : "Não iniciada"
              }
              action={ativo && habilitado ? (
                <Dialog
                  title="Período de Migração"
                  description="Período em que o módulo esteve em processo de migração."
                  trigger={
                    <button type="button" className={btnXsGhost} title="Migração" aria-label="Migração">
                      <Waves className="h-3.5 w-3.5" /> Registrar Período
                    </button>
                  }
                >
                  <DialogForm action={actions.migracao}>
                    <input type="hidden" name="id" value={modulo.id} />
                    <input type="hidden" name="municipioId" value={municipioId} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Data inicial">
                        <input type="date" name="migracaoInicio" defaultValue={modulo.migracaoInicio ?? todayISO()} className={inputCls} />
                      </Field>
                      <Field label="Data final" hint="Deixar vazio marca como em andamento.">
                        <input type="date" name="migracaoFim" defaultValue={modulo.migracaoFim ?? ""} className={inputCls} />
                      </Field>
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton className={btnXs.replace("h-8", "h-10").replace("text-xs", "text-sm")}>Salvar migração</SubmitButton>
                    </div>
                  </DialogForm>
                </Dialog>
              ) : null}
            />
            <DetailAction
              label="Implantacao"
              value=""
              action={ativo && habilitado ? (
                <ImplantacaoStatusForm
                  id={modulo.id}
                  municipioId={municipioId}
                  defaultValue={modulo.implantacaoStatus}
                  action={actions.implantacao}
                />
              ) : null}
            />
            <DetailAction
              label="Execucao"
              value={modulo.execucaoInicio ? `Desde ${formatDate(modulo.execucaoInicio)}` : "Não iniciada"}
              action={ativo && habilitado && !modulo.execucaoInicio ? (
                <Dialog
                  title="Iniciar execução"
                  description="Data em que o cliente iniciou efetivamente a utilização do módulo (diferente da habilitação)."
                  trigger={
                    <button type="button" className={btnXs} title="Iniciar execução" aria-label="Iniciar execução">
                      <Play className="h-3.5 w-3.5" /> Iniciar Execução
                    </button>
                  }
                >
                  <DialogForm action={actions.execucao}>
                    <input type="hidden" name="id" value={modulo.id} />
                    <input type="hidden" name="municipioId" value={municipioId} />
                    <Field label="Data inicial de utilização">
                      <input type="date" name="execucaoInicio" required defaultValue={todayISO()} className={inputCls} />
                    </Field>
                    <div className="flex justify-end">
                      <SubmitButton className={btnXs.replace("h-8", "h-10").replace("text-xs", "text-sm")}>Registrar execução</SubmitButton>
                    </div>
                  </DialogForm>
                </Dialog>
              ) : null}
            />
            <DetailAction
              label="Desabilitacao"
              value={
                modulo.desabilitadoAt
                  ? `${formatDate(modulo.desabilitadoAt)} - ${optLabel(modulo.desabilitadoMotivo)}`
                  : "Modulo ativo"
              }
              action={
                ativo && habilitado ? (
                  <Dialog
                    title="Desabilitar módulo"
                    description="O histórico anterior nunca é apagado — a desativação vira um evento."
                    trigger={
                      <button type="button" className={btnXsGhost} title="Desabilitar" aria-label="Desabilitar">
                        <Ban className="h-3.5 w-3.5 text-app-danger" /> Desabilitar
                      </button>
                    }
                  >
                    <DialogForm action={actions.desabilitar}>
                      <input type="hidden" name="id" value={modulo.id} />
                      <input type="hidden" name="municipioId" value={municipioId} />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Data">
                          <input type="date" name="data" required defaultValue={todayISO()} className={inputCls} />
                        </Field>
                        <Field label="Motivo">
                          <select name="motivo" required className={selectCls} defaultValue="">
                            <option value="" disabled>Selecione…</option>
                            {DESABILITACAO_MOTIVOS.map((motivo) => (
                              <option key={motivo.value} value={motivo.value}>{motivo.label}</option>
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
                ) : !ativo ? (
                  <form action={actions.reabilitar}>
                    <input type="hidden" name="id" value={modulo.id} />
                    <input type="hidden" name="municipioId" value={municipioId} />
                    <SubmitButton className={btnXs}>
                      <RotateCcw className="h-3.5 w-3.5" /> Reabilitar
                    </SubmitButton>
                  </form>
                ) : null
              }
            />
          </div>
          {modulo.desabilitadoJustificativa ? (
            <p className="mt-3 rounded-app-md bg-app-surface px-3 py-2 text-xs text-app-muted-foreground">
              {modulo.desabilitadoJustificativa}
            </p>
          ) : null}
        </section>

        <section className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <h3 className="text-sm font-bold text-app-foreground">Contratos vinculados</h3>
          <div className="mt-3 flex flex-col gap-2">
            {contratos.length === 0 ? (
              <Empty title="Nenhum contrato vinculado" />
            ) : (
              contratos.map((contrato) => {
                const view = contratoView(contrato);
                return (
                  <Link
                    key={contrato.id}
                    href={`/contratos/${contrato.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface px-3 py-2.5 transition-colors hover:border-app-muted-foreground/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-foreground">
                        <FileText className="mr-1.5 inline h-4 w-4 text-app-muted-foreground" />
                        Contrato {contrato.numero}
                        <span className="ml-2 text-xs font-normal text-app-muted-foreground">
                          {optLabel(contrato.modalidade)}
                        </span>
                      </p>
                      <p className="text-xs text-app-muted-foreground">
                        Vigencia: {formatDate(contrato.dataInicio)} {"->"} {formatDate(contrato.dataFim)}
                      </p>
                    </div>
                    <Badge tone={view.tone}>{view.label}</Badge>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <h3 className="text-sm font-bold text-app-foreground">Responsaveis</h3>
          <div className="mt-3 flex flex-col gap-2">
            {responsaveis.length === 0 ? (
              <Empty title="Nenhum responsavel vinculado" />
            ) : (
              responsaveis.map((responsavel) => (
                <div
                  key={responsavel.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-app-foreground">{responsavel.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted-foreground">
                      {responsavel.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {responsavel.email}
                        </span>
                      ) : null}
                      {responsavel.celular ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {responsavel.celular}
                        </span>
                      ) : null}
                      {!responsavel.email && !responsavel.celular ? <span>Contato pendente</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={responsavel.avisoHabilitacaoEmail ? "success" : "muted"}>
                      Aviso por e-mail: {responsavel.avisoHabilitacaoEmail ? "Sim" : "Não"}
                    </Badge>
                    <span className="text-[11px] text-app-muted-foreground">
                      Criado em {formatDateTime(responsavel.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-app-md bg-app-surface px-3 py-2">
      <p className="text-[11px] font-semibold text-app-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-app-foreground">{value}</p>
    </div>
  );
}

function DetailAction({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-app-md bg-app-surface px-3 py-2">
      <p className="text-[11px] font-semibold text-app-muted-foreground">{label}</p>
      {value ? <p className="mt-0.5 text-sm text-app-foreground">{value}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
