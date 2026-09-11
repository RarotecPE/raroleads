import { DataPageLoading } from "@/components/data-loading";

export default function ContratoDetailLoading() {
  return (
    <DataPageLoading
      detailTitle="Contrato"
      panels={["Módulos vinculados", "Aditivos", "Documentos", "Histórico do contrato"]}
    />
  );
}
