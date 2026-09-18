import { DataPageLoading } from "@/components/data-loading";

export default function ContratosLoading() {
  return (
    <DataPageLoading
      stats={["Contratos", "Clientes com contrato", "Bases contempladas", "Módulos contemplados"]}
      panels={["Contratos"]}
    />
  );
}
