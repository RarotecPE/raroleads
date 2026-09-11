import { DataPageLoading } from "@/components/data-loading";

export default function ContratosLoading() {
  return (
    <DataPageLoading
      stats={["Contratos ativos", "Próximos do vencimento", "Vencidos", "Sem assinatura"]}
      panels={["Contratos"]}
    />
  );
}
