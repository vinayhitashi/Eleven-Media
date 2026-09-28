import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { PlatformBadge } from "@/components/charts/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { requireAdminPage } from "@/lib/auth";
import { listClients } from "@/lib/data";
import { cn, formatNumber, initials, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

const TABS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ status?: string; new?: string; q?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireAdminPage();
  const status = (TABS.find((t) => t.value === sp.status)?.value ?? "active") as "active" | "archived" | "all";
  const q = sp.q?.trim().toLowerCase() ?? "";
  const clients = (await listClients(viewer, { status })).filter(
    (c) => !q || [c.name, c.company, c.industry, c.email].some((f) => f?.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Clients" description="Every client has a private workspace — content, connected platforms, analytics and reports." actions={<ClientFormDialog defaultOpen={sp.new === "1"} />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-lg border border-border-strong bg-surface p-0.5" aria-label="Client status">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/clients?status=${t.value}`}
              className={cn("rounded-md px-3 py-1.5 text-[12.5px] font-medium text-muted hover:text-fg", status === t.value && "bg-accent text-accent-fg hover:text-accent-fg")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="w-full sm:w-72">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search clients…"
            className="h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-[13px] placeholder:text-subtle focus:border-fg focus:outline-none"
          />
        </form>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={q ? "No clients match your search" : status === "archived" ? "No archived clients" : "No clients yet"}
          description={q ? "Try a different name or company." : "Create a client to start tracking their content and growth."}
          action={!q && status !== "archived" ? <ClientFormDialog /> : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th className="hidden md:table-cell">Business</Th>
                <Th>Platforms</Th>
                <Th className="text-right">Content</Th>
                <Th className="hidden lg:table-cell">Last sync</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-surface-2/60">
                  <Td>
                    <Link href={`/clients/${c.id}`} className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--accent-glow)] bg-accent-soft text-[12px] font-semibold text-accent-text">{initials(c.name)}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium text-fg">
                          {c.name}
                          {c.status === "archived" ? <Badge tone="outline">Archived</Badge> : null}
                        </span>
                        <span className="block truncate text-[12.5px] text-subtle">{c.company ?? c.email ?? "—"}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="hidden text-muted md:table-cell">{c.industry ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.length ? c.platforms.map((p) => <PlatformBadge key={p} platform={p} />) : <span className="text-[12.5px] text-subtle">None connected</span>}
                    </div>
                  </Td>
                  <Td className="text-right tabular">{formatNumber(c.content_count)}</Td>
                  <Td className="hidden text-[12.5px] text-subtle lg:table-cell">{relativeTime(c.last_synced_at)}</Td>
                  <Td>
                    <Link href={`/clients/${c.id}`} aria-label={`Open ${c.name}`} className="text-subtle group-hover:text-fg">
                      <ChevronRight className="size-4" />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
