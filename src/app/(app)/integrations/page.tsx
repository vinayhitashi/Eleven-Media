import type { Metadata } from "next";
import { Plug, ShieldCheck } from "lucide-react";
import { AccountsList } from "@/components/integrations/accounts-list";
import { platformCatalog } from "@/components/integrations/catalog";
import { ConnectCard } from "@/components/integrations/connect-card";
import { ConnectionNotice } from "@/components/integrations/connection-notice";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/misc";
import { UrlSelect } from "@/components/ui/url-select";
import { requireViewer } from "@/lib/auth";
import { listClients, listSocialAccounts } from "@/lib/data";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ client?: string; connected?: string; error?: string; warning?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const isAdmin = viewer.role === "admin";
  const [clients, accounts] = await Promise.all([isAdmin ? listClients(viewer) : Promise.resolve([]), listSocialAccounts(viewer, isAdmin ? null : viewer.client_id)]);
  const connectFor = isAdmin ? (clients.find((c) => c.id === sp.client)?.id ?? null) : viewer.client_id;
  const catalog = platformCatalog();

  return (
    <>
      <PageHeader
        eyebrow="Connections"
        title="Integrations"
        description="Accounts are connected with each platform’s official OAuth and read-only scopes. We never scrape and never store passwords."
      />
      <ConnectionNotice connected={sp.connected} error={sp.error} warning={sp.warning} />

      <div className="space-y-8">
        <Card>
          <CardHeader title={isAdmin ? "Connected accounts" : "Your connected accounts"} description="Synced daily. Metric history is kept even if an account is disconnected." />
          <CardBody>
            {accounts.length ? (
              <AccountsList accounts={accounts} showClient={isAdmin} canManage={isAdmin} />
            ) : (
              <EmptyState icon={<Plug />} title="No accounts connected yet" description={isAdmin ? "Choose a client below and connect their YouTube channel." : "Connect your YouTube channel below to share analytics with Eleven Media."} />
            )}
          </CardBody>
        </Card>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <SectionTitle className="mb-0">Platforms</SectionTitle>
            {isAdmin ? (
              <UrlSelect param="client" label="Connect for client" value={connectFor} placeholder="Choose client to connect…" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((item) => (
              <ConnectCard key={item.id} item={item} clientId={connectFor} returnTo="/integrations" />
            ))}
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-[13px] text-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-fg" />
          <div>
            <div className="font-medium text-fg">How your data is handled</div>
            <p className="mt-1">
              YouTube is connected with <code className="rounded bg-surface-2 px-1">youtube.readonly</code> and <code className="rounded bg-surface-2 px-1">yt-analytics.readonly</code> only — nothing can be posted or changed.
              Tokens are AES-256-GCM encrypted and are never readable from the browser. Metrics a platform doesn’t provide are shown as “Not available”, never estimated.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
