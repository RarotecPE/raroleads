"use client";

import { useRouter } from "next/navigation";
import { selectCls } from "@/components/ui";

export function PendenciasClienteFilter({
  clientes,
  filtro,
  clienteSelecionado,
}: {
  clientes: { id: string; nome: string }[];
  filtro: string;
  clienteSelecionado: string;
}) {
  const router = useRouter();

  return (
    <label className="flex w-full flex-col gap-1.5 sm:max-w-xs">
      <span className="text-xs font-semibold text-app-muted-foreground">Cliente</span>
      <select
        className={selectCls}
        value={clienteSelecionado}
        onChange={(event) => {
          const params = new URLSearchParams({ s: filtro });
          if (event.target.value) params.set("cliente", event.target.value);
          router.push(`/pendencias?${params.toString()}`);
        }}
      >
        <option value="">Todos os clientes</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
