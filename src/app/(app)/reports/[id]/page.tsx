import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReportActions } from "@/components/reports/report-actions";
import { ReportView } from "@/components/reports/report-view";
import { Badge } from "@/components/ui/badge";
import { requireViewer } from "@/lib/auth";
import { getReport } from "@/lib/data";
import { formatMonth, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Report preview" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const report = await getReport(viewer, id);
  if (!report) notFound();
  const isAdmin = viewer.role === "admin";

  return (
    <div className="mx-auto max-w-[1080px]">
      <Link href="/reports" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-fg no-print">
        <ArrowLeft className="size-3.5" /> All reports
      </Link>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{report.client_name} · {formatMonth(report.month)}</h1>
            {isAdmin ? report.status === "published" ? <Badge tone="good" dot>Published</Badge> : <Badge tone="warn" dot>Draft — not visible to client</Badge> : null}
          </div>
          <p className="mt-1 text-[13px] text-subtle">Generated {relativeTime(report.updated_at)} · figures frozen at generation</p>
        </div>
        <ReportActions id={report.id} status={report.status} clientId={report.client_id} month={report.month} isAdmin={isAdmin} />
      </div>
      <ReportView data={report.data} />
    </div>
  );
}
