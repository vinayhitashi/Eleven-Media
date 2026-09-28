"use client";

import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { removeClientUserAction, revokeInvitationAction } from "@/lib/actions/clients";
import { runAction } from "@/components/ui/use-action-toast";

export function TeamRowActions({ kind, id, clientId }: { kind: "user" | "invite"; id: string; clientId: string }) {
  const [pending, start] = useTransition();
  const label = kind === "user" ? "Remove access" : "Revoke invitation";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`${label}?`)) return;
        start(async () => void (await runAction(() => (kind === "user" ? removeClientUserAction(id, clientId) : revokeInvitationAction(id, clientId)))));
      }}
      className="rounded-md p-1.5 text-subtle opacity-0 transition hover:bg-bad-bg hover:text-bad focus:opacity-100 group-hover:opacity-100"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
    </button>
  );
}
