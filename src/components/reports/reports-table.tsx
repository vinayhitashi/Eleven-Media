import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReportListItem } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/misc";
import { formatCompact, formatMonth, formatNumber, relativeTime } from "@/lib/utils";

export function ReportsTable({ reports, showClient, isAdmin }: { reports: ReportListItem[]; showClient?: boolean; isAdmin: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Month</Th>
          {showClient ? <Th>Client</Th> : null}
          <Th className="text-right">Posts</Th>
          <Th className="text-right">Views</Th>
          <Th className="hidden text-right sm:table-cell">Subs gained</Th>
          {isAdmin ? <Th className="hidden md:table-cell">Status</Th> : null}
          <Th className="hidden lg:table-cell">Generated</Th>
          <Th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {reports.map((r) => (
          <tr key={r.id} className="group transition-colors hover:bg-surface-2/60">
            <Td>
              <Link href={`/reports/${r.id}`} className="font-medium hover:underline hover:underline-offset-4">{formatMonth(r.month)}</Link>
            </Td>
            {showClient ? <Td className="text-muted">{r.client_name}</Td> : null}
            <Td className="text-right tabular">{formatNumber(r.total_posts)}</Td>
            <Td className="text-right tabular">{formatCompact(r.total_views)}</Td>
            <Td className="hidden text-right tabular sm:table-cell">{r.followers_gained === null ? <span className="text-[12px] text-subtle">Not available</span> : `${r.followers_gained > 0 ? "+" : ""}${formatNumber(r.followers_gained)}`}</Td>
            {isAdmin ? (
              <Td className="hidden md:table-cell">
                {r.status === "published" ? <Badge tone="good" dot>Published</Badge> : <Badge tone="warn" dot>Draft</Badge>}
              </Td>
            ) : null}
            <Td className="hidden text-[12.5px] text-subtle lg:table-cell">{relativeTime(r.updated_at)}</Td>
            <Td>
              <Link href={`/reports/${r.id}`} aria-label="Open report" className="text-subtle group-hover:text-fg">
                <ChevronRight className="size-4" />
              </Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
