import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { GenerateReportDialog } from "@/components/reports/generate-report-dialog";
import { ReportsTable } from "@/components/reports/reports-table";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { UrlSelect } from "@/components/ui/url-select";
import { requireViewer } from "@/lib/auth";
import { listClients, listReports } from "@/lib/data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ client?: string; generate?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const isAdmin = viewer.role === "admin";
  const [clients, reports] = await Promise.all([isAdmin ? listClients(viewer) : Promise.resolve([]), listReports(viewer, isAdmin ? sp.client : null)]);
  const clientOpts = clients.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Monthly reports"
        description={isAdmin ? "Generate → preview → publish or download as a branded PDF. Reports are frozen when generated." : "Your monthly growth reports from Eleven Media."}
        actions={isAdmin ? <GenerateReportDialog clients={clientOpts} defaultClientId={sp.client} defaultOpen={sp.generate === "1"} /> : null}
      />
      {isAdmin ? (
        <div className="mb-4">
          <UrlSelect param="client" label="Client" value={sp.client} placeholder="All clients" options={clientOpts.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
      ) : null}
      {reports.length ? (
        <Card className="overflow-hidden">
          <ReportsTable reports={reports} showClient={isAdmin && !sp.client} isAdmin={isAdmin} />
        </Card>
      ) : (
        <EmptyState
          icon={<FileText />}
          title="No reports yet"
          description={isAdmin ? "Generate your first monthly report for a client." : "Your first monthly report will appear here once it’s published."}
          action={isAdmin ? <GenerateReportDialog clients={clientOpts} /> : undefined}
        />
      )}
    </>
  );
}
