"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/dialog";
import { Field, btnGhost, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { BASE_TIPOS, MODULE_CATALOG } from "@/lib/constants";
import { atualizarProposta, createProposta } from "@/lib/proposal-actions";
import { cn, norm } from "@/lib/utils";

type ClientOption = { id: string; nome: string; municipio: string; uf: string };
type BaseOption = { id: string; municipioId: string; nome: string; tipo: string };
type ModuleOption = { id: string; baseId: string; nome: string };
type DraftBase = { key: string; nome: string; tipo: string; modulos: string[] };
export type ProposalFormInitialData = {
  id: string;
  tipo: "implantacao_sistema" | "consultoria";
  municipioId: string | null;
  clienteNomeSnapshot: string;
  municipioNome: string;
  uf: string;
  codigoIbge: string | null;
  atividadeConjunta: boolean | null;
  observacoes: string | null;
  especificidades: string[];
  items: { id: string; baseId: string | null; nome: string; tipo: string | null; modulos: { baseModuleId: string | null; nome: string }[] }[];
};

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const newDraftBase = (): DraftBase => ({ key: crypto.randomUUID(), nome: "", tipo: "Prefeitura", modulos: [] });
const selectionKey = (baseId: string, moduleName: string) => `${baseId}:${norm(moduleName)}`;

function ModuleBadgeSelector({ selected, onChange, modules = [], contractedModuleIds = new Set<string>() }: {
  selected: string[];
  onChange: (modules: string[]) => void;
  modules?: ModuleOption[];
  contractedModuleIds?: Set<string>;
}) {
  const selectedSet = new Set(selected);
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Módulos da base">
    {MODULE_CATALOG.map((moduleName) => {
      const registered = modules.find((module) => norm(module.nome) === norm(moduleName));
      const contracted = registered ? contractedModuleIds.has(registered.id) : false;
      const active = selectedSet.has(moduleName);
      return <button
        key={moduleName}
        type="button"
        aria-pressed={active}
        aria-label={`${moduleName}${contracted ? ", já contratado" : ""}`}
        title={contracted ? "Módulo já contratado" : undefined}
        onClick={() => onChange(active ? selected.filter((name) => name !== moduleName) : [...selected, moduleName])}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-app-pill border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary",
          active ? "border-app-primary bg-app-primary text-app-primary-foreground" : "border-app-border bg-app-surface-elevated text-app-muted-foreground hover:border-app-primary hover:text-app-foreground",
          contracted && (active ? "ring-2 ring-app-success ring-offset-1 ring-offset-app-surface" : "border-app-success bg-app-success/10 text-app-success"),
        )}
      >
        {contracted ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {moduleName}
        {contracted ? <span className="sr-only"> (já contratado)</span> : null}
      </button>;
    })}
  </div>;
}

function DraftBaseEditor({ base, onChange, onRemove, removable }: {
  base: DraftBase;
  onChange: (base: DraftBase) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return <div className="space-y-3 rounded-app-md border border-app-border p-3">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <Field label="Base"><input required value={base.nome} onChange={(event) => onChange({ ...base, nome: event.target.value })} className={inputCls} placeholder="Ex.: Saúde" /></Field>
      <Field label="Tipo"><select value={base.tipo} onChange={(event) => onChange({ ...base, tipo: event.target.value })} className={selectCls}>{BASE_TIPOS.map((value) => <option key={value}>{value}</option>)}</select></Field>
      {removable ? <button type="button" onClick={onRemove} className={`${btnGhost} self-end`} aria-label={`Remover base ${base.nome || "sem nome"}`} title="Remover base"><Trash2 className="h-4 w-4" /></button> : <span />}
    </div>
    <Field label="Módulos" hint="Toque nas badges para selecionar os módulos desta base">
      <ModuleBadgeSelector selected={base.modulos} onChange={(modulos) => onChange({ ...base, modulos })} />
    </Field>
  </div>;
}

export function ProposalRequestForm({ clientes, bases, modulos, contractedModuleIds, initialData }: {
  clientes: ClientOption[];
  bases: BaseOption[];
  modulos: ModuleOption[];
  contractedModuleIds: string[];
  initialData?: ProposalFormInitialData;
}) {
  const [tipo, setTipo] = useState<"implantacao_sistema" | "consultoria">(initialData?.tipo ?? "implantacao_sistema");
  const [origem, setOrigem] = useState<"cadastrado" | "avulso">(initialData && !initialData.municipioId ? "avulso" : "cadastrado");
  const [municipioId, setMunicipioId] = useState(initialData?.municipioId ?? "");
  const [selectedBases, setSelectedBases] = useState<Set<string>>(() => new Set(initialData?.items.flatMap((item) => item.baseId ? [item.baseId] : []) ?? []));
  const [selectedModules, setSelectedModules] = useState<Set<string>>(() => new Set(initialData?.items.flatMap((item) => item.baseId ? item.modulos.map((module) => selectionKey(item.baseId!, module.nome)) : []) ?? []));
  const [consultModuleId, setConsultModuleId] = useState(initialData?.tipo === "consultoria" ? initialData.items[0]?.modulos[0]?.baseModuleId ?? "" : "");
  const [draftBases, setDraftBases] = useState<DraftBase[]>(() => initialData?.items.filter((item) => !item.baseId).map((item) => ({ key: item.id, nome: item.nome, tipo: item.tipo ?? "Outros", modulos: item.modulos.map((module) => module.nome) })) ?? []);
  const [uf, setUf] = useState(initialData?.uf ?? "PE");
  const [ibgeCities, setIbgeCities] = useState<{ id: string; nome: string }[]>([]);
  const [codigoIbge, setCodigoIbge] = useState(initialData?.codigoIbge ?? "");

  const contractedSet = useMemo(() => new Set(contractedModuleIds), [contractedModuleIds]);
  const clientBases = useMemo(() => bases.filter((base) => base.municipioId === municipioId), [bases, municipioId]);
  const clientBaseIds = useMemo(() => new Set(clientBases.map((base) => base.id)), [clientBases]);
  const clientModules = useMemo(() => modulos.filter((module) => clientBaseIds.has(module.baseId)), [clientBaseIds, modulos]);
  const selectedCity = ibgeCities.find((city) => city.id === codigoIbge);

  useEffect(() => {
    if (origem !== "avulso" || tipo !== "implantacao_sistema") return;
    fetch(`/api/ibge/municipios?uf=${encodeURIComponent(uf)}`)
      .then((response) => response.json())
      .then((payload: { ok: boolean; data: { id: string; nome: string }[] }) => setIbgeCities(payload.ok ? payload.data : []))
      .catch(() => setIbgeCities([]));
  }, [origem, tipo, uf]);

  const registeredItems = clientBases.filter((base) => selectedBases.has(base.id)).map((base) => {
    const baseModules = clientModules.filter((module) => module.baseId === base.id);
    return {
      baseId: base.id, nome: base.nome, tipo: base.tipo,
      modulos: MODULE_CATALOG.filter((name) => selectedModules.has(selectionKey(base.id, name))).map((name) => {
        const registered = baseModules.find((module) => norm(module.nome) === norm(name));
        return { baseModuleId: registered?.id, nome: name };
      }),
    };
  });
  const draftItems = draftBases.filter((base) => base.nome.trim()).map((base) => ({
    nome: base.nome.trim(), tipo: base.tipo, modulos: base.modulos.map((nome) => ({ nome })),
  }));
  const items = tipo === "implantacao_sistema" ? [...(origem === "cadastrado" ? registeredItems : []), ...draftItems] : [];

  function resetSelections(nextMunicipioId: string) {
    setMunicipioId(nextMunicipioId);
    setSelectedBases(new Set());
    setSelectedModules(new Set());
    setDraftBases([]);
    setConsultModuleId("");
  }

  function setDraft(index: number, base: DraftBase) {
    setDraftBases((current) => current.map((item, itemIndex) => itemIndex === index ? base : item));
  }

  function toggleBase(baseId: string) {
    setSelectedBases((current) => {
      const next = new Set(current);
      if (next.has(baseId)) {
        next.delete(baseId);
        setSelectedModules((modules) => new Set([...modules].filter((key) => !key.startsWith(`${baseId}:`))));
      } else next.add(baseId);
      return next;
    });
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    if (tipo !== "implantacao_sistema") return;
    if (items.length === 0 || items.some((item) => item.modulos.length === 0)) {
      event.preventDefault();
      window.alert("Selecione ao menos uma base e um módulo para cada base.");
      return;
    }
    const names = items.map((item) => norm(item.nome.trim()));
    if (new Set(names).size !== names.length) {
      event.preventDefault();
      window.alert("Não é possível adicionar a mesma base mais de uma vez.");
      return;
    }
    if (origem === "cadastrado" && draftBases.some((draft) => clientBases.some((base) => norm(base.nome.trim()) === norm(draft.nome.trim())))) {
      event.preventDefault();
      window.alert("Uma das novas bases já está cadastrada para este cliente.");
    }
  }

  return <form action={initialData ? atualizarProposta : createProposta} onSubmit={validate} className="flex flex-col gap-5">
    {initialData ? <>
      <input type="hidden" name="id" value={initialData.id} />
      <input type="hidden" name="tipo" value={initialData.tipo} />
      {initialData.municipioId ? <input type="hidden" name="municipioId" value={initialData.municipioId} /> : null}
      <input type="hidden" name="clienteNomeSnapshot" value={initialData.clienteNomeSnapshot} />
      <input type="hidden" name="municipioNome" value={initialData.municipioNome} />
      <input type="hidden" name="uf" value={initialData.uf} />
      {initialData.codigoIbge ? <input type="hidden" name="codigoIbge" value={initialData.codigoIbge} /> : null}
    </> : null}
    <section className="rounded-app-lg border border-app-border bg-app-surface p-4 sm:p-5">
      <h2 className="text-sm font-bold text-app-foreground">1. Modalidade</h2>
      {initialData ? <div className="mt-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4"><p className="font-semibold text-app-foreground">{tipo === "consultoria" ? "Consultoria" : "Implantação do sistema"}</p><p className="mt-1 text-xs text-app-muted-foreground">A modalidade não pode ser alterada após a solicitação.</p></div> : <div className="mt-3 grid gap-3 sm:grid-cols-2">{([ ["implantacao_sistema", "Implantação do sistema"], ["consultoria", "Consultoria"] ] as const).map(([value, label]) => <label key={value} className={`cursor-pointer rounded-app-md border p-4 ${tipo === value ? "border-app-primary bg-app-primary/10" : "border-app-border"}`}><input type="radio" name="tipo" value={value} checked={tipo === value} onChange={() => { setTipo(value); setOrigem("cadastrado"); resetSelections(""); }} className="mr-2 accent-app-primary" /><span className="font-semibold text-app-foreground">{label}</span></label>)}</div>}
    </section>

    <section className="rounded-app-lg border border-app-border bg-app-surface p-4 sm:p-5">
      <h2 className="text-sm font-bold text-app-foreground">2. Cliente e escopo</h2>
      {tipo === "implantacao_sistema" && !initialData ? <div className="mt-3 flex gap-2"><button type="button" className={origem === "cadastrado" ? btnPrimary : btnGhost} onClick={() => { setOrigem("cadastrado"); resetSelections(""); }}>Cliente cadastrado</button><button type="button" className={origem === "avulso" ? btnPrimary : btnGhost} onClick={() => { setOrigem("avulso"); resetSelections(""); setDraftBases([newDraftBase()]); }}>Município avulso</button></div> : null}

      {origem === "cadastrado" || tipo === "consultoria" ? <div className="mt-4 space-y-4">
        <Field label="Cliente">{initialData ? <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5"><p className="text-sm font-semibold text-app-foreground">{initialData.clienteNomeSnapshot}</p><p className="text-xs text-app-muted-foreground">{initialData.municipioNome}/{initialData.uf} · cliente original da proposta</p></div> : <select name="municipioId" required value={municipioId} onChange={(event) => resetSelections(event.target.value)} className={selectCls}><option value="" disabled>Selecione...</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome} · {cliente.municipio}/{cliente.uf}</option>)}</select>}</Field>
        {tipo === "consultoria" ? <>
          <Field label="Base e módulo"><select name="baseModuleId" required value={consultModuleId} onChange={(event) => setConsultModuleId(event.target.value)} className={selectCls}><option value="" disabled>Selecione...</option>{clientModules.map((module) => <option key={module.id} value={module.id}>{clientBases.find((base) => base.id === module.baseId)?.nome} · {module.nome}</option>)}</select></Field>
          <Field label="Especificidades técnicas"><div className="grid gap-2 sm:grid-cols-2">{[["portal","Portal"],["sagres","Envio SAGRES"],["esocial","Envio eSocial"],["recadastramento","Recadastramento"]].map(([value,label]) => <label key={value} className="flex items-center gap-2 text-sm text-app-foreground"><input type="checkbox" name="especificidades" value={value} defaultChecked={initialData?.especificidades.includes(value)} className="accent-app-primary" />{label}</label>)}</div></Field>
          <Field label="Atividades realizadas em conjunto com o município?"><div className="flex gap-5 text-sm text-app-foreground"><label><input required type="radio" name="atividadeConjunta" value="sim" defaultChecked={initialData?.atividadeConjunta === true} className="mr-2 accent-app-primary" />Sim</label><label><input required type="radio" name="atividadeConjunta" value="nao" defaultChecked={initialData?.atividadeConjunta === false} className="mr-2 accent-app-primary" />Não</label></div></Field>
        </> : <div className="space-y-4">{municipioId ? <>
          <div className="space-y-3">{clientBases.length ? clientBases.map((base) => {
            const active = selectedBases.has(base.id);
            const baseModules = clientModules.filter((module) => module.baseId === base.id);
            const selected = MODULE_CATALOG.filter((name) => selectedModules.has(selectionKey(base.id, name)));
            return <div key={base.id} className={cn("rounded-app-md border p-3", active ? "border-app-primary" : "border-app-border")}><button type="button" aria-expanded={active} onClick={() => toggleBase(base.id)} className="flex w-full items-center justify-between gap-3 text-left font-semibold text-app-foreground"><span>{base.nome}<span className="ml-2 text-xs font-normal text-app-muted-foreground">{base.tipo}</span></span>{active ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{active ? <div className="mt-3 border-t border-app-border pt-3"><ModuleBadgeSelector modules={baseModules} contractedModuleIds={contractedSet} selected={selected} onChange={(names) => setSelectedModules((current) => { const next = new Set([...current].filter((key) => !key.startsWith(`${base.id}:`))); names.forEach((name) => next.add(selectionKey(base.id, name))); return next; })} /></div> : null}</div>;
          }) : <p className="text-sm text-app-muted-foreground">Este cliente ainda não possui bases cadastradas. Adicione uma base para compor a proposta.</p>}</div>
          {draftBases.length ? <div className="space-y-3 border-t border-app-border pt-4"><p className="text-sm font-bold text-app-foreground">Novas bases da proposta</p>{draftBases.map((base, index) => <DraftBaseEditor key={base.key} base={base} removable onChange={(value) => setDraft(index, value)} onRemove={() => setDraftBases((current) => current.filter((item) => item.key !== base.key))} />)}</div> : null}
          <button type="button" className={btnGhost} onClick={() => setDraftBases((current) => [...current, newDraftBase()])}><Plus className="h-4 w-4" /> Adicionar base</button>
          <p className="text-xs text-app-muted-foreground"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-app-success" />Badges verdes indicam módulos já contratados; eles ainda podem ser selecionados.</p>
        </> : null}</div>}
      </div> : <div className="mt-4 space-y-4">
        {initialData ? <Field label="Cliente"><div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5"><p className="text-sm font-semibold text-app-foreground">{initialData.clienteNomeSnapshot}</p><p className="text-xs text-app-muted-foreground">{initialData.municipioNome}/{initialData.uf}{initialData.codigoIbge ? ` · IBGE ${initialData.codigoIbge}` : ""} · cliente original da proposta</p></div></Field> : <><div className="grid gap-4 sm:grid-cols-3"><Field label="Nome do cliente"><input name="clienteNomeSnapshot" required className={inputCls} placeholder="Ex.: Prefeitura Municipal" /></Field><Field label="UF"><select name="uf" value={uf} onChange={(event) => { setUf(event.target.value); setCodigoIbge(""); }} className={selectCls}>{UFS.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Município"><select required value={codigoIbge} onChange={(event) => setCodigoIbge(event.target.value)} className={selectCls}><option value="" disabled>Selecione...</option>{ibgeCities.map((city) => <option key={city.id} value={city.id}>{city.nome}</option>)}</select></Field></div><input type="hidden" name="codigoIbge" value={codigoIbge} /><input type="hidden" name="municipioNome" value={selectedCity?.nome ?? ""} /></>}
        <div className="space-y-3">{draftBases.map((base, index) => <DraftBaseEditor key={base.key} base={base} removable={draftBases.length > 1} onChange={(value) => setDraft(index, value)} onRemove={() => setDraftBases((current) => current.filter((item) => item.key !== base.key))} />)}</div>
        <button type="button" className={btnGhost} onClick={() => setDraftBases((current) => [...current, newDraftBase()])}><Plus className="h-4 w-4" /> Adicionar base</button>
      </div>}
      <input type="hidden" name="itens" value={JSON.stringify(items)} />
    </section>

    <section className="rounded-app-lg border border-app-border bg-app-surface p-4 sm:p-5"><Field label="Observações"><textarea name="observacoes" defaultValue={initialData?.observacoes ?? ""} rows={4} className={textareaCls} /></Field></section>
    <div className="flex justify-end"><SubmitButton className={btnPrimary}>{initialData ? "Salvar alterações" : "Solicitar proposta"}</SubmitButton></div>
  </form>;
}
