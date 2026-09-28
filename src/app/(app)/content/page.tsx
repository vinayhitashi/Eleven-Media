import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";
import { AddContentDialog } from "@/components/content/add-content-dialog";
import { ContentTable } from "@/components/content/content-table";
import { FilterSelects } from "@/components/content/filter-selects";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { listClients, listContent } from "@/lib/data";
import { isPlatform } from "@/platforms/registry";

export const metadata: Metadata = { title: "Content library" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ client?: string; platform?: string; q?: string; add?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const isAdmin = viewer.role === "admin";
  const platform = isPlatform(sp.platform) ? sp.platform : null;
  const [clients, items] = await Promise.all([
    isAdmin ? listClients(viewer) : Promise.resolve([]),
    listContent(viewer, { clientId: isAdmin ? sp.client : null, platform, q: sp.q }),
  ]);
  const clientOpts = clients.map((c) => ({ id: c.id, name: c.name }));
  const filtered = Boolean(sp.client || platform || sp.q);

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Content"
        description="Every tracked post and video. Metrics are lifetime totals from the latest daily snapshot; “Not available” means the platform API doesn’t provide it."
        actions={isAdmin ? <AddContentDialog clients={clientOpts} defaultClientId={sp.client} defaultOpen={sp.add === "1"} /> : null}
      />
      <div className="mb-4">
        <FilterSelects clients={isAdmin ? clientOpts : undefined} client={sp.client} platform={platform} q={sp.q} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<LibraryBig />}
          title={filtered ? "No content matches these filters" : "Your library is empty"}
          description={filtered ? "Try clearing a filter." : isAdmin ? "Paste a YouTube, Instagram, TikTok, Facebook or LinkedIn link to start tracking it." : "Eleven Media will add your content here as it’s published."}
          action={!filtered && isAdmin ? <AddContentDialog clients={clientOpts} /> : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <ContentTable items={items} showClient={isAdmin && !sp.client} canEdit={isAdmin} />
        </Card>
      )}
    </>
  );
}
