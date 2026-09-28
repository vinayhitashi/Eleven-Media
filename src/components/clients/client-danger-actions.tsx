"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { deleteClientAction, setClientStatusAction } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { runAction } from "@/components/ui/use-action-toast";

export function ClientDangerActions({ client }: { client: Client }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const archived = client.status === "archived";

  return (
    <>
      <Button
        variant="ghost"
        loading={pending}
        onClick={() => start(async () => void (await runAction(() => setClientStatusAction(client.id, archived ? "active" : "archived"))))}
      >
        {archived ? <ArchiveRestore /> : <Archive />}
        {archived ? "Restore" : "Archive"}
      </Button>
      <Button variant="ghost" className="text-bad hover:text-bad" onClick={() => setOpen(true)}>
        <Trash2 /> Delete
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete client permanently?" description="This deletes the workspace, all content, metric history, connected accounts and reports. Archive instead if you may need the history.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => void (await runAction(() => deleteClientAction(client.id, confirm))));
          }}
        >
          <Field label={`Type “${client.name}” to confirm`} htmlFor="confirm-name">
            <Input id="confirm-name" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={confirm !== client.name} loading={pending}>Delete client</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
