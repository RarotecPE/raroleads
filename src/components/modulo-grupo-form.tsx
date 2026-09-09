"use client";

import { Plus } from "lucide-react";
import { useId, useMemo, useState, type FormEventHandler, type ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Empty, Field, Badge, btnPrimary, btnSecondary, btnXsGhost, inputCls, textareaCls } from "@/components/ui";
import { createModulosEmGrupo } from "@/lib/actions";
import { MODULE_CATALOG } from "@/lib/constants";
import { norm } from "@/lib/utils";

export function ModuloGrupoForm({
  municipioId,
  bases,
  modulos,
  trigger,
}: {
  municipioId: string;
  bases: { id: string; nome: string; tipo: string }[];
  modulos: { baseId: string; nome: string }[];
  trigger?: ReactNode;
}) {
  const datalistId = useId();
  const [nome, setNome] = useState("");
  const [selectedBaseIds, setSelectedBaseIds] = useState<Set<string>>(new Set());
  const nomeNormalizado = norm(nome);
  const basesOrdenadas = useMemo(
    () => [...bases].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [bases],
  );
  const basesDisponiveis = useMemo(() => {
    if (!nomeNormalizado) return [];
    const basesComModulo = new Set(
      modulos
        .filter((modulo) => norm(modulo.nome) === nomeNormalizado)
        .map((modulo) => modulo.baseId),
    );
    return basesOrdenadas.filter((base) => !basesComModulo.has(base.id));
  }, [basesOrdenadas, modulos, nomeNormalizado]);
  const selectedDisponiveis = [...selectedBaseIds].filter((baseId) =>
    basesDisponiveis.some((base) => base.id === baseId),
  );
  const todasSelecionadas = basesDisponiveis.length > 0 && selectedDisponiveis.length === basesDisponiveis.length;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    if (selectedDisponiveis.length === 0) {
      event.preventDefault();
      window.alert("Selecione ao menos uma base para cadastrar o módulo.");
    }
  };

  function toggleBase(baseId: string, checked: boolean) {
    setSelectedBaseIds((current) => {
      const next = new Set(current);
      if (checked) next.add(baseId);
      else next.delete(baseId);
      return next;
    });
  }

  function setTodasDisponiveis(checked: boolean) {
    setSelectedBaseIds((current) => {
      const next = new Set(current);
      for (const base of basesDisponiveis) {
        if (checked) next.add(base.id);
        else next.delete(base.id);
      }
      return next;
    });
  }

  return (
    <Dialog
      trigger={
        trigger ?? (
          <button type="button" className={btnSecondary}>
            <Plus className="h-4 w-4" /> Módulo em grupo
          </button>
        )
      }
      title="Módulo em grupo"
      description="Cadastre o mesmo módulo em várias bases do cliente."
    >
      <DialogForm action={createModulosEmGrupo} onSubmit={handleSubmit}>
        <input type="hidden" name="municipioId" value={municipioId} />
        <Field label="Nome do módulo" hint="Sugestões do catálogo; texto livre permitido.">
          <input
            name="nome"
            required
            list={datalistId}
            value={nome}
            onChange={(event) => {
              setNome(event.target.value);
              setSelectedBaseIds(new Set());
            }}
            className={inputCls}
            placeholder="Ex.: Contabilidade"
          />
          <datalist id={datalistId}>
            {MODULE_CATALOG.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        <Field label="Observações">
          <textarea name="observacoes" rows={2} className={textareaCls} />
        </Field>
        <section className="rounded-app-md border border-app-border bg-app-surface-elevated/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-app-foreground">Bases</p>
            {basesDisponiveis.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge tone="primary">{selectedDisponiveis.length}/{basesDisponiveis.length}</Badge>
                <button type="button" className={btnXsGhost} onClick={() => setTodasDisponiveis(!todasSelecionadas)}>
                  {todasSelecionadas ? "Limpar" : "Selecionar todas"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="mt-3">
            {!nomeNormalizado ? (
              <Empty title="Informe o módulo" description="As bases disponíveis aparecerão após preencher o nome." />
            ) : basesDisponiveis.length === 0 ? (
              <Empty title="Nenhuma base disponível" description="Todas as bases já possuem esse módulo." />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {basesDisponiveis.map((base) => (
                  <label
                    key={base.id}
                    className="flex items-start gap-2 rounded-app-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-foreground"
                  >
                    <input
                      type="checkbox"
                      name="baseIds"
                      value={base.id}
                      checked={selectedBaseIds.has(base.id)}
                      onChange={(event) => toggleBase(base.id, event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-app-border bg-app-surface text-app-primary"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{base.nome}</span>
                      <span className="block text-xs text-app-muted-foreground">{base.tipo}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>Cadastrar módulo nas bases</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
