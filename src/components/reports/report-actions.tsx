"use client";

import { useTransition } from "react";
import { Download, EyeOff, RefreshCw, Send, Trash2 } from "lucide-react";
import { deleteReportAction, generateReportAction, setReportStatusAction } from "@/lib/actions/reports";
import { Button, buttonClasses } from "@/components/ui/button";
import { runAction } from "@/components/ui/use-action-toast";

export function ReportActions({ id, status, clientId, month, isAdmin }: { id: string; status: "draft" | "published"; clientId: string; month: string; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={`/api/reports/${id}/pdf`} className={buttonClasses(isAdmin ? "secondary" : "primary")}>
        <Download /> Download PDF
      </a>
      {isAdmin ? (
        <>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                fd.set("clientId", clientId);
                fd.set("month", month.slice(0, 7));
                await runAction(() => generateReportAction(null, fd));
              })
            }
          >
            <RefreshCw /> Regenerate
          </Button>
          <Button
            variant="ghost"
            className="text-bad hover:text-bad"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Delete this report?")) start(async () => void (await runAction(() => deleteReportAction(id))));
            }}
          >
            <Trash2 /> Delete
          </Button>
          {status === "draft" ? (
            <Button loading={pending} onClick={() => start(async () => void (await runAction(() => setReportStatusAction(id, "published"))))}>
              <Send /> Publish to client
            </Button>
          ) : (
            <Button variant="secondary" loading={pending} onClick={() => start(async () => void (await runAction(() => setReportStatusAction(id, "draft"))))}>
              <EyeOff /> Unpublish
            </Button>
          )}
        </>
      ) : null}
    </div>
  );
}
