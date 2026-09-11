import { DataPageLoading } from "@/components/data-loading";

export default function DashboardLoading() {
  return (
    <DataPageLoading
      stats={["Clientes", "Bases", "Módulos", "Contratos", "Vencimentos", "Formalização", "Habilitação", "Pendências"]}
      panels={["Alertas de vigência", "Pendências abertas", "Oportunidades comerciais", "Resumo operacional"]}
    />
  );
}
