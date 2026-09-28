import { ExternalLink } from "lucide-react";
import type { ContentWithLatest } from "@/lib/types";
import { PlatformBadge } from "@/components/charts/platform-icon";
import { Badge } from "@/components/ui/badge";
import { NotAvailable, Table, Td, Th } from "@/components/ui/misc";
import { formatDate, formatNumber, relativeTime } from "@/lib/utils";
import { ContentThumb } from "./thumb";
import { DeleteContentButton } from "./delete-content-button";

const Metric = ({ v }: { v: number | null | undefined }) => (v === null || v === undefined ? <NotAvailable /> : <span className="tabular">{formatNumber(v)}</span>);

const STATUS: Record<string, { tone: "good" | "warn" | "bad" | "neutral"; label: string }> = {
  ok: { tone: "good", label: "Synced" },
  pending: { tone: "warn", label: "Pending" },
  unavailable: { tone: "neutral", label: "No API yet" },
  error: { tone: "bad", label: "Sync error" },
};

export function ContentTable({ items, showClient, canEdit }: { items: ContentWithLatest[]; showClient?: boolean; canEdit?: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Content</Th>
          {showClient ? <Th className="hidden lg:table-cell">Client</Th> : null}
          <Th className="hidden sm:table-cell">Published</Th>
          <Th className="text-right">Views</Th>
          <Th className="hidden text-right md:table-cell">Likes</Th>
          <Th className="hidden text-right md:table-cell">Comments</Th>
          <Th className="hidden text-right xl:table-cell">Shares</Th>
          <Th className="hidden text-right xl:table-cell" title="Subscribers the platform attributes to this video — not the channel total">Subs from video</Th>
          <Th className="hidden lg:table-cell">Status</Th>
          {canEdit ? <Th className="w-10" /> : null}
        </tr>
      </thead>
      <tbody>
        {items.map((c) => {
          const s = STATUS[c.metrics_status] ?? STATUS.pending!;
          return (
            <tr key={c.id} className="group transition-colors hover:bg-surface-2/60">
              <Td className="min-w-[280px]">
                <div className="flex items-center gap-3">
                  <ContentThumb src={c.thumbnail_url} platform={c.platform} />
                  <div className="min-w-0">
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium text-fg hover:underline hover:underline-offset-4">
                      {c.title ?? c.url}
                      <ExternalLink className="ml-1 inline size-3 text-subtle opacity-0 group-hover:opacity-100" />
                    </a>
                    <div className="mt-1 flex items-center gap-1.5">
                      <PlatformBadge platform={c.platform} />
                      {c.content_type ? <span className="text-[11.5px] capitalize text-subtle">{c.content_type}</span> : null}
                    </div>
                  </div>
                </div>
              </Td>
              {showClient ? <Td className="hidden text-muted lg:table-cell">{c.client_name ?? "—"}</Td> : null}
              <Td className="hidden whitespace-nowrap text-muted sm:table-cell">{formatDate(c.published_at)}</Td>
              <Td className="text-right"><Metric v={c.latest?.views} /></Td>
              <Td className="hidden text-right md:table-cell"><Metric v={c.latest?.likes} /></Td>
              <Td className="hidden text-right md:table-cell"><Metric v={c.latest?.comments} /></Td>
              <Td className="hidden text-right xl:table-cell"><Metric v={c.latest?.shares} /></Td>
              <Td className="hidden text-right xl:table-cell"><Metric v={c.latest?.followers_gained} /></Td>
              <Td className="hidden lg:table-cell">
                <div className="flex flex-col items-start gap-1">
                  <Badge tone={s.tone} dot>{s.label}</Badge>
                  <span className="text-[11px] text-subtle">{c.latest ? `Snapshot ${formatDate(c.latest.recorded_on)}` : relativeTime(c.last_synced_at)}</span>
                </div>
              </Td>
              {canEdit ? (
                <Td>
                  <DeleteContentButton id={c.id} title={c.title ?? c.url} />
                </Td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
