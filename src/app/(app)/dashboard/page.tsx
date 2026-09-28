import type { Metadata } from "next";
import { Plus, Sparkles } from "lucide-react";
import { AnalyticsCharts, CoverageNote, KpiGrid } from "@/components/dashboard/analytics-overview";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { getAnalytics, getClient, getOverviewCounts, listClients } from "@/lib/data";
import { parseRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Dashboard" };

type SP = Promise<{ range?: string; from?: string; to?: string; client?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const range = parseRange(sp);
  const isAdmin = viewer.role === "admin";

  if (!isAdmin && !viewer.client_id) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="Your workspace is being set up"
        description="Your account isn’t linked to a client workspace yet. Eleven Media will let you know when your dashboard is ready."
        className="mt-10"
      />
    );
  }

  const clientId = isAdmin ? (sp.client ?? null) : viewer.client_id;
  const [clients, counts, analytics, workspace] = await Promise.all([
    isAdmin ? listClients(viewer) : Promise.resolve([]),
    getOverviewCounts(viewer),
    getAnalytics(viewer, { clientId, range }),
    !isAdmin && viewer.client_id ? getClient(viewer, viewer.client_id) : Promise.resolve(null),
  ]);
  const selected = clients.find((c) => c.id === clientId);
  const totalContent = clientId && isAdmin ? (selected?.content_count ?? analytics.current.contentTracked) : counts.content;

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? (selected ? "Client overview" : "Agency overview") : (workspace?.company ?? workspace?.name ?? "Your workspace")}
        title={isAdmin ? (selected ? selected.name : "Overview") : "Your growth"}
        description={`${range.label} · compared with the previous ${range.preset === "custom" ? "period" : range.label.replace("Last ", "")}`}
        actions={
          isAdmin ? (
            <>
              <ButtonLink href="/content?add=1" variant="secondary"><Plus /> Add content</ButtonLink>
              <ButtonLink href="/reports?generate=1">Generate report</ButtonLink>
            </>
          ) : null
        }
      />

      <div className="mb-6">
        <FilterBar range={range.preset} from={range.start} to={range.end} clients={isAdmin ? clients.map((c) => ({ id: c.id, name: c.name })) : undefined} clientId={clientId} />
      </div>

      {isAdmin ? <div className="mb-6"><GettingStarted counts={counts} /></div> : null}
      {isAdmin && counts.clients === 0 ? null : (
        <div className="space-y-6">
          <CoverageNote a={analytics} />
          <KpiGrid a={analytics} totalClients={isAdmin && !clientId ? counts.clients : undefined} totalContent={totalContent} />
          <AnalyticsCharts a={analytics} />
        </div>
      )}
    </>
  );
}
