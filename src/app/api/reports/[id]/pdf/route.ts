import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { getReport } from "@/lib/data";
import { renderReportPdf } from "@/lib/reports/pdf";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Streams the branded PDF. Access is checked through getReport(), which uses the
 * viewer's RLS-scoped client — clients can only download their own published reports.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await getReport(viewer, id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdf = await renderReportPdf(report.data);
  const month = report.month.slice(0, 7);
  const filename = `Eleven-Media_${report.client_name.replace(/[^a-z0-9]+/gi, "-")}_${month}.pdf`;

  // Keep an archived copy in private storage (admin downloads only).
  if (viewer.role === "admin") {
    try {
      const admin = createAdminClient();
      const path = `${report.client_id}/${month}.pdf`;
      const { error } = await admin.storage.from("reports").upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (!error) await admin.from("reports").update({ pdf_url: `reports/${path}` }).eq("id", report.id);
    } catch (err) {
      console.error("[report pdf] archive failed", err);
    }
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
