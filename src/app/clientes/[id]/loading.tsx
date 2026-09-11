import { DataPageLoading } from "@/components/data-loading";

export default function ClienteDetailLoading() {
  return (
    <DataPageLoading
      detailTitle="Cliente"
      panels={["Bases e módulos", "Responsáveis", "Contratos", "Documentos", "Pendências", "Linha do tempo"]}
    />
  );
}
