import { DataPageLoading } from "@/components/data-loading";

export default function DashboardLoading() {
  return (
    <DataPageLoading
      stats={["Clientes", "Bases", "Módulos", "Contratos", "Clientes com contrato", "Módulos sem contrato", "Habilitação", "Pendências"]}
      panels={["Pendências abertas", "Oportunidades comerciais"]}
    />
  );
}
