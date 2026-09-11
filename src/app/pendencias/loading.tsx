import { DataPageLoading } from "@/components/data-loading";

export default function PendenciasLoading() {
  return (
    <DataPageLoading
      stats={["Abertas", "Resolvidas", "Clientes com pendências"]}
      panels={["Pendências"]}
    />
  );
}
