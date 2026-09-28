"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { inviteAdminAction } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { useActionToast } from "@/components/ui/use-action-toast";

export function InviteAdminDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteAdminAction, null);
  useActionToast(state, () => setOpen(false));
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><UserPlus /> Invite admin</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Invite an agency admin" description="Admins can see and manage every client workspace, connection and report.">
        <form action={action} className="space-y-4">
          <Field label="Name" htmlFor="adm-name"><Input id="adm-name" name="name" /></Field>
          <Field label="Email" htmlFor="adm-email"><Input id="adm-email" name="email" type="email" required /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>Send invitation</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
