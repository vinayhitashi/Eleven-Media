import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, LibraryBig, Mail, Plug, UserX } from "lucide-react";
import { AnalyticsCharts, CoverageNote, KpiGrid } from "@/components/dashboard/analytics-overview";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ClientDangerActions } from "@/components/clients/client-danger-actions";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { InviteDialog } from "@/components/clients/invite-dialog";
import { TeamRowActions } from "@/components/clients/team-row-actions";
import { AddContentDialog } from "@/components/content/add-content-dialog";
import { ContentTable } from "@/components/content/content-table";
import { AccountsList } from "@/components/integrations/accounts-list";
import { platformCatalog } from "@/components/integrations/catalog";
import { ConnectCard } from "@/components/integrations/connect-card";
import { GenerateReportDialog } from "@/components/reports/generate-report-dialog";
import { ReportsTable } from "@/components/reports/reports-table";
import { ConnectionNotice } from "@/components/integrations/connection-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { requireAdminPage } from "@/lib/auth";
import { getAnalytics, getClient, listClientTeam, listContent, listReports, listSocialAccounts } from "@/lib/data";
import { parseRange } from "@/lib/dates";
import { cn, formatDate, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Client workspace" };

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "content", label: "Content" },
  { value: "platforms", label: "Platforms" },
  { value: "reports", label: "Reports" },
  { value: "team", label: "Client access" },
] as const;

type SP = Promise<{ tab?: string; range?: string; from?: string; to?: string; connected?: string; error?: string; warning?: string }>;

export default async function ClientWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await requireAdminPage();
  const client = await getClient(viewer, id);
  if (!client) notFound();
  const tab = TABS.find((t) => t.value === sp.tab)?.value ?? "overview";
  const clientOpt = [{ id: client.id, name: client.name }];

  return (
    <>
      <Link href="/clients" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-fg">
        <ArrowLeft className="size-3.5" /> All clients
      </Link>

      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 animate-fade-in">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-lg font-bold text-accent-fg shadow-[0_10px_30px_-10px_var(--accent-glow)]">{initials(client.name)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{client.name}</h1>
              {client.status === "archived" ? <Badge tone="outline">Archived</Badge> : <Badge tone="good" dot>Active</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {[client.company, client.industry].filter(Boolean).join(" · ") || "—"}
              {client.email ? (
                <>
                  {" · "}
                  <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-fg"><Mail className="size-3" />{client.email}</a>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClientFormDialog client={client} />
          <InviteDialog clientId={client.id} clientName={client.name} />
          <GenerateReportDialog clients={clientOpt} defaultClientId={client.id} />
        </div>
      </div>

      <ConnectionNotice connected={sp.connected} error={sp.error} warning={sp.warning} />

      <nav className="scrollbar-thin mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Workspace sections">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/clients/${client.id}?tab=${t.value}`}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 border-transparent px-3 pb-3 pt-1 text-[13.5px] font-medium text-subtle transition-colors hover:text-fg",
              tab === t.value && "border-accent text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? <OverviewTab clientId={client.id} sp={sp} /> : null}
      {tab === "content" ? <ContentTab clientId={client.id} clientName={client.name} /> : null}
      {tab === "platforms" ? <PlatformsTab clientId={client.id} /> : null}
      {tab === "reports" ? <ReportsTab clientId={client.id} clientName={client.name} /> : null}
      {tab === "team" ? <TeamTab clientId={client.id} clientName={client.name} /> : null}

      {tab === "overview" ? (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-[12.5px] text-subtle">Client since {formatDate(client.created_at)}</p>
          <div className="flex gap-1">
            <ClientDangerActions client={client} />
          </div>
        </div>
      ) : null}
    </>
  );
}

async function OverviewTab({ clientId, sp }: { clientId: string; sp: Awaited<SP> }) {
  const viewer = await requireAdminPage();
  const range = parseRange(sp);
  const analytics = await getAnalytics(viewer, { clientId, range });
  return (
    <div className="space-y-6">
      <FilterBar range={range.preset} from={range.start} to={range.end} />
      <CoverageNote a={analytics} />
      <KpiGrid a={analytics} totalContent={analytics.current.contentTracked} />
      <AnalyticsCharts a={analytics} />
    </div>
  );
}

async function ContentTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const viewer = await requireAdminPage();
  const items = await listContent(viewer, { clientId });
  return (
    <Card>
      <CardHeader title="Content" description={`${items.length} item(s) tracked · lifetime totals from the latest snapshot`} action={<AddContentDialog clients={[{ id: clientId, name: clientName }]} defaultClientId={clientId} />} />
      <CardBody className="px-0 pb-2">
        {items.length ? (
          <ContentTable items={items} canEdit />
        ) : (
          <div className="px-5">
            <EmptyState icon={<LibraryBig />} title="No content yet" description="Paste a YouTube link, or connect the channel and import recent uploads." />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

async function PlatformsTab({ clientId }: { clientId: string }) {
  const viewer = await requireAdminPage();
  const accounts = await listSocialAccounts(viewer, clientId);
  const catalog = platformCatalog();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Connected accounts" description="OAuth connections used for daily analytics sync. Tokens are encrypted at rest." />
        <CardBody>
          {accounts.length ? (
            <AccountsList accounts={accounts} canManage />
          ) : (
            <EmptyState icon={<Plug />} title="No accounts connected" description="Connect the client’s YouTube channel to unlock subscriber growth, shares and historical analytics." />
          )}
        </CardBody>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((item) => (
          <ConnectCard key={item.id} item={item} clientId={clientId} />
        ))}
      </div>
      <p className="text-[12.5px] text-subtle">
        Tip: the channel owner can also connect from their own client login (Integrations), so you never need their Google password.
      </p>
    </div>
  );
}

async function ReportsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const viewer = await requireAdminPage();
  const reports = await listReports(viewer, clientId);
  return (
    <Card>
      <CardHeader title="Monthly reports" action={<GenerateReportDialog clients={[{ id: clientId, name: clientName }]} defaultClientId={clientId} variant="secondary" />} />
      <CardBody className="px-0 pb-2">
        {reports.length ? (
          <ReportsTable reports={reports} isAdmin />
        ) : (
          <div className="px-5">
            <EmptyState icon={<FileText />} title="No reports yet" description="Generate a monthly report once there’s at least a few days of snapshot history." />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

async function TeamTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const viewer = await requireAdminPage();
  const { users, invitations } = await listClientTeam(viewer, clientId);
  return (
    <Card>
      <CardHeader title="Client access" description="People who can sign in to this client’s private dashboard." action={<InviteDialog clientId={clientId} clientName={clientName} variant="primary" />} />
      <CardBody className="px-0 pb-2">
        {users.length || invitations.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Status</Th>
                <Th className="hidden sm:table-cell">Since</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="group">
                  <Td>
                    <div className="font-medium">{u.name ?? u.email}</div>
                    <div className="text-[12.5px] text-subtle">{u.email}</div>
                  </Td>
                  <Td><Badge tone="good" dot>Active</Badge></Td>
                  <Td className="hidden text-muted sm:table-cell">{formatDate(u.created_at)}</Td>
                  <Td><TeamRowActions kind="user" id={u.id} clientId={clientId} /></Td>
                </tr>
              ))}
              {invitations.map((i) => (
                <tr key={i.id} className="group">
                  <Td>
                    <div className="font-medium">{i.email}</div>
                    <div className="text-[12.5px] text-subtle">Invitation sent</div>
                  </Td>
                  <Td><Badge tone="warn" dot>Pending</Badge></Td>
                  <Td className="hidden text-muted sm:table-cell">{formatDate(i.created_at)}</Td>
                  <Td><TeamRowActions kind="invite" id={i.id} clientId={clientId} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="px-5">
            <EmptyState icon={<UserX />} title="No one has access yet" description="Invite the client so they can see their own dashboard and reports." />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
