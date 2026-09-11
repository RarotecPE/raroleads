import { LoaderCircle } from "lucide-react";
import { Panel, PanelHeader, Stat } from "@/components/ui";

export function DataLoadingIcon({ label = "Carregando dados" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-app-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex min-h-11 items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2"
        >
          <span className="h-2.5 w-1/2 max-w-56 rounded-app-pill bg-app-surface-elevated" aria-hidden="true" />
          <DataLoadingIcon />
        </div>
      ))}
    </div>
  );
}

export function DataPageLoading({
  stats = [],
  panels,
  detailTitle,
}: {
  stats?: string[];
  panels: string[];
  detailTitle?: string;
}) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      {detailTitle ? (
        <Panel className="p-4 sm:p-5">
          <div className="flex min-h-8 items-center gap-3">
            <h2 className="text-xl font-bold text-app-foreground">{detailTitle}</h2>
            <DataLoadingIcon label={`Carregando ${detailTitle.toLowerCase()}`} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Resumo", "Situação", "Vigência", "Vínculos"].map((label) => (
              <Stat key={label} label={label} value={<DataLoadingIcon label={`Carregando ${label.toLowerCase()}`} />} />
            ))}
          </div>
        </Panel>
      ) : null}

      {stats.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((label) => (
            <Stat key={label} label={label} value={<DataLoadingIcon label={`Carregando ${label.toLowerCase()}`} />} />
          ))}
        </div>
      ) : null}

      <div className={panels.length > 1 ? "grid grid-cols-1 gap-5 xl:grid-cols-2" : "flex flex-col gap-5"}>
        {panels.map((title) => (
          <Panel key={title}>
            <PanelHeader title={title} description="Carregando informações do banco de dados" />
            <LoadingRows />
          </Panel>
        ))}
      </div>
    </div>
  );
}
