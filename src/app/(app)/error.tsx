"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
      <div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-bad-bg text-bad">
        <AlertTriangle className="size-5" />
      </div>
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="mt-1.5 text-[13px] text-muted">We couldn’t load this page. No data was changed.</p>
      {error.digest ? <p className="mt-2 font-mono text-[11px] text-subtle">Ref: {error.digest}</p> : null}
      <Button onClick={reset} variant="secondary" className="mt-6"><RotateCw /> Try again</Button>
    </div>
  );
}
