"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Link2, Plus, XCircle } from "lucide-react";
import { addContentAction } from "@/lib/actions/content";
import { detectContentUrl } from "@/platforms/detect";
import { PLATFORM_META } from "@/platforms/meta";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { useActionToast } from "@/components/ui/use-action-toast";

const LIVE_PLATFORMS = new Set(["youtube"]);

export function AddContentDialog({
  clients,
  defaultClientId,
  defaultOpen = false,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [url, setUrl] = useState("");
  const [state, action, pending] = useActionState(addContentAction, null);
  useActionToast(state, () => {
    setOpen(false);
    setUrl("");
  });
  const parsed = useMemo(() => detectContentUrl(url), [url]);
  const live = parsed ? LIVE_PLATFORMS.has(parsed.platform) : false;

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0} title={clients.length === 0 ? "Create a client first" : undefined}>
        <Plus /> Add content
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add content" description="Paste a link. We detect the platform, look it up via the official API and start tracking daily snapshots.">
        <form action={action} className="space-y-4">
          <Field label="Client" htmlFor="clientId">
            <Select id="clientId" name="clientId" defaultValue={defaultClientId ?? clients[0]?.id} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Content URL" htmlFor="url">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input id="url" name="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="pl-9" autoFocus />
            </div>
          </Field>

          {url ? (
            <div className="rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[13px]" aria-live="polite">
              {parsed ? (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
                  <div>
                    <div className="font-medium text-fg">
                      {PLATFORM_META[parsed.platform].label}
                      {parsed.contentType ? <span className="font-normal capitalize text-muted"> · {parsed.contentType}</span> : null}
                    </div>
                    <div className="mt-0.5 font-mono text-[11.5px] text-subtle">ID: {parsed.contentId ?? "not in URL"}</div>
                    <div className="mt-1.5 text-[12.5px] text-muted">
                      {live
                        ? "Title, date and metrics will be fetched from the YouTube Data API."
                        : `${PLATFORM_META[parsed.platform].label} API integration is coming in Stage 3 — the link is catalogued and metrics show as “Not available”.`}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-muted">
                  <XCircle className="size-4 shrink-0 text-bad" /> Not a recognised YouTube, Instagram, TikTok, Facebook or LinkedIn link.
                </div>
              )}
            </div>
          ) : null}

          {parsed && !live ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="title">
                <Input id="title" name="title" placeholder="Post title or caption" />
              </Field>
              <Field label="Published on" htmlFor="publishedAt">
                <Input id="publishedAt" name="publishedAt" type="date" />
              </Field>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending} disabled={!parsed}>Add to library</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
