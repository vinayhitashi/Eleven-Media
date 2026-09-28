"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteContentAction } from "@/lib/actions/content";
import { runAction } from "@/components/ui/use-action-toast";

export function DeleteContentButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${title}`}
      title="Remove from library"
      onClick={() => {
        if (!window.confirm(`Remove “${title}” and its metric history?`)) return;
        start(async () => void (await runAction(() => deleteContentAction(id))));
      }}
      className="rounded-md p-1.5 text-subtle opacity-0 transition hover:bg-bad-bg hover:text-bad focus:opacity-100 group-hover:opacity-100"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
