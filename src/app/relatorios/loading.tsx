import { DataPageLoading } from "@/components/data-loading";

export default function RelatoriosLoading() {
  return (
    <DataPageLoading
      panels={[
        "Relatórios impressos",
        "Clientes por situação",
        "Clientes sem contrato",
        "Bases sem cobertura contratual",
        "Módulos",
        "Contratos",
        "Pendências por cliente",
      ]}
    />
  );
}
