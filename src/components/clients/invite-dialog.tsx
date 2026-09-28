"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { inviteClientUserAction } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { useActionToast } from "@/components/ui/use-action-toast";

export function InviteDialog({ clientId, clientName, variant = "secondary" }: { clientId: string; clientName: string; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteClientUserAction, null);
  useActionToast(state, () => setOpen(false));
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}><UserPlus /> Invite</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Invite to ${clientName}`} description="They’ll get an email to set a password. Client users can only ever see this workspace.">
        <form action={action} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="Name" htmlFor="inv-name">
            <Input id="inv-name" name="name" placeholder="Matt Lowe" />
          </Field>
          <Field label="Email" htmlFor="inv-email">
            <Input id="inv-email" name="email" type="email" required placeholder="matt@example.com" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>Send invitation</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
