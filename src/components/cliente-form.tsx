"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnPrimary, inputCls, selectCls, textareaCls } from "@/components/ui";
import { createMunicipio, updateMunicipio } from "@/lib/actions";
import { MUNICIPIO_SITUACOES } from "@/lib/constants";

interface UfOption {
  id: number;
  sigla: string;
  nome: string;
}

interface MunicipioOption {
  id: string;
  nome: string;
}

interface MunicipioDetalhe {
  id: string;
  nome: string;
  uf: string;
  populacao: number | null;
}

const FALLBACK_UFS: UfOption[] = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
].map((sigla) => ({ id: 0, sigla, nome: sigla }));

export function ClienteForm({
  trigger,
  cliente,
}: {
  trigger: ReactNode;
  cliente?: {
    id: string;
    clienteNome: string;
    municipio: string;
    uf: string;
    codigoIbge: string | null;
    populacao: number | null;
    situacao: string;
    dadosAdministrativos: string | null;
    observacoes: string | null;
  };
}) {
  const [ufs, setUfs] = useState<UfOption[]>(FALLBACK_UFS);
  const [uf, setUf] = useState(cliente?.uf ?? "PE");
  const [municipios, setMunicipios] = useState<MunicipioOption[]>([]);
  const [codigoIbge, setCodigoIbge] = useState(cliente?.codigoIbge ?? "");
  const [municipioNome, setMunicipioNome] = useState(cliente?.municipio ?? "");
  const [populacao, setPopulacao] = useState(cliente?.populacao?.toString() ?? "");
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [ibgeError, setIbgeError] = useState<string | null>(null);

  const municipioOptions = useMemo(() => {
    if (!codigoIbge || municipios.some((municipio) => municipio.id === codigoIbge)) return municipios;
    return [{ id: codigoIbge, nome: municipioNome || codigoIbge }, ...municipios];
  }, [codigoIbge, municipioNome, municipios]);

  useEffect(() => {
    let active = true;

    fetch("/api/ibge/ufs")
      .then((response) => response.json())
      .then((payload: { ok: boolean; data: UfOption[] }) => {
        if (active && payload.ok && payload.data.length > 0) setUfs(payload.data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMunicipios() {
      await Promise.resolve();
      if (!active) return;

      setLoadingMunicipios(true);
      setIbgeError(null);

      fetch(`/api/ibge/municipios?uf=${encodeURIComponent(uf)}`)
        .then((response) => response.json())
        .then((payload: { ok: boolean; data: MunicipioOption[] }) => {
          if (!active) return;
          if (payload.ok) {
            setMunicipios(payload.data);
            return;
          }
          setMunicipios([]);
          setIbgeError("Nao foi possivel carregar os municipios do IBGE.");
        })
        .catch(() => {
          if (active) {
            setMunicipios([]);
            setIbgeError("Nao foi possivel carregar os municipios do IBGE.");
          }
        })
        .finally(() => {
          if (active) setLoadingMunicipios(false);
        });
    }

    loadMunicipios();

    return () => {
      active = false;
    };
  }, [uf]);

  function loadMunicipioDetalhe(nextCodigoIbge: string) {
    setCodigoIbge(nextCodigoIbge);
    const option = municipioOptions.find((municipio) => municipio.id === nextCodigoIbge);
    if (option) setMunicipioNome(option.nome);
    if (!nextCodigoIbge) {
      setMunicipioNome("");
      setPopulacao("");
      return;
    }

    setLoadingDetalhe(true);
    setIbgeError(null);
    fetch(`/api/ibge/municipios/${encodeURIComponent(nextCodigoIbge)}`)
      .then((response) => response.json())
      .then((payload: { ok: boolean; data?: MunicipioDetalhe }) => {
        if (!payload.ok || !payload.data) {
          setIbgeError("Nao foi possivel carregar os dados do municipio.");
          return;
        }
        setMunicipioNome(payload.data.nome);
        setUf(payload.data.uf || uf);
        setPopulacao(payload.data.populacao?.toString() ?? "");
      })
      .catch(() => setIbgeError("Nao foi possivel carregar os dados do municipio."))
      .finally(() => setLoadingDetalhe(false));
  }

  return (
    <Dialog
      trigger={trigger}
      title={cliente ? "Editar cliente" : "Novo cliente"}
      description="Cliente com municipio vinculado ao cadastro oficial do IBGE."
      maxWidth="max-w-2xl"
    >
      <DialogForm action={cliente ? updateMunicipio : createMunicipio}>
        {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}
        <input type="hidden" name="municipio" value={municipioNome} />
        <input type="hidden" name="uf" value={uf} />
        <input type="hidden" name="codigoIbge" value={codigoIbge} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nome do cliente" className="sm:col-span-3">
            <input name="clienteNome" required defaultValue={cliente?.clienteNome ?? ""} className={inputCls} placeholder="Ex.: Prefeitura Municipal de Tacaratu" />
          </Field>
          <Field label="UF">
            <select
              required
              value={uf}
              className={selectCls}
              onChange={(event) => {
                setUf(event.target.value);
                setCodigoIbge("");
                setMunicipioNome("");
                setPopulacao("");
              }}
            >
              {ufs.map((item) => (
                <option key={`${item.sigla}-${item.id}`} value={item.sigla}>
                  {item.sigla} - {item.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Municipio" className="sm:col-span-2">
            <select
              required
              value={codigoIbge}
              className={selectCls}
              disabled={loadingMunicipios}
              onChange={(event) => loadMunicipioDetalhe(event.target.value)}
            >
              <option value="" disabled>{loadingMunicipios ? "Carregando..." : "Selecione..."}</option>
              {municipioOptions.map((municipio) => (
                <option key={municipio.id} value={municipio.id}>{municipio.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Codigo IBGE">
            <input readOnly value={codigoIbge} className={inputCls} />
          </Field>
          <Field label="Populacao estimada">
            <input
              name="populacao"
              type="number"
              min={0}
              inputMode="numeric"
              value={populacao}
              onChange={(event) => setPopulacao(event.target.value)}
              className={inputCls}
              placeholder={loadingDetalhe ? "Carregando..." : "Informe manualmente"}
            />
          </Field>
          <Field label="Situacao">
            <select name="situacao" required defaultValue={cliente?.situacao ?? "prospect"} className={selectCls}>
              {MUNICIPIO_SITUACOES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>
        {ibgeError ? <p className="text-xs font-medium text-app-warning">{ibgeError}</p> : null}
        <Field label="Dados administrativos">
          <textarea name="dadosAdministrativos" rows={2} defaultValue={cliente?.dadosAdministrativos ?? ""} className={textareaCls} placeholder="Prefeito(a), contatos, gestao vigente..." />
        </Field>
        <Field label="Observacoes">
          <textarea name="observacoes" rows={2} defaultValue={cliente?.observacoes ?? ""} className={textareaCls} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton className={btnPrimary}>{cliente ? "Salvar alteracoes" : "Cadastrar cliente"}</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
