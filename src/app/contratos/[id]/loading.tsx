import { DataPageLoading } from "@/components/data-loading";

export default function ContratoDetailLoading() {
  return (
    <DataPageLoading
      detailTitle="Contrato"
      panels={["Bases e módulos contemplados", "Documentos do contrato", "Histórico do vínculo"]}
    />
  );
}
