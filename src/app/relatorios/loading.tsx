import { DataPageLoading } from "@/components/data-loading";

export default function RelatoriosLoading() {
  return (
    <DataPageLoading
      panels={[
        "Relatórios impressos",
        "Clientes por situação",
        "Clientes sem contrato vigente",
        "Bases sem formalização",
        "Módulos",
        "Contratos",
        "Pendências por cliente",
      ]}
    />
  );
}
