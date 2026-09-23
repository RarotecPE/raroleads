import { FileDown } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui";
import { reportLinks } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";

export default function RelatoriosPage() {
  return (
    <Panel>
      <PanelHeader title="Relatórios impressos" description="PDFs consolidados para reuniões, acompanhamento e arquivo" />
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
        {reportLinks().map((report) => (
          <a
            key={report.tipo}
            href={report.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/40 px-3 py-2.5 transition-colors hover:border-app-muted-foreground/40"
          >
            <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-app-foreground">{report.title}</span>
              <span className="mt-0.5 block text-xs text-app-muted-foreground">{report.description}</span>
            </span>
          </a>
        ))}
      </div>
    </Panel>
  );
}
