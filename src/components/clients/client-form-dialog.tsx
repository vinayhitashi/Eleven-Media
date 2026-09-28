"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { useActionToast } from "@/components/ui/use-action-toast";

export function ClientFormDialog({ client, defaultOpen = false }: { client?: Client; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const editing = Boolean(client);
  const [state, action, pending] = useActionState(editing ? updateClientAction : createClientAction, null);
  useActionToast(editing ? state : null, () => setOpen(false));

  return (
    <>
      {editing ? (
        <Button variant="secondary" onClick={() => setOpen(true)}><Pencil /> Edit</Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> New client</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit client" : "New client"} description={editing ? undefined : "Each client gets a private workspace for their content, analytics and reports."}>
        <form action={action} className="space-y-4">
          {client ? <input type="hidden" name="id" value={client.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" htmlFor="name">
              <Input id="name" name="name" required defaultValue={client?.name} placeholder="Matt Lowe" autoFocus />
            </Field>
            <Field label="Company" htmlFor="company">
              <Input id="company" name="company" defaultValue={client?.company ?? ""} placeholder="Lowe Estates" />
            </Field>
            <Field label="Business / niche" htmlFor="industry">
              <Input id="industry" name="industry" defaultValue={client?.industry ?? ""} placeholder="Dubai Real Estate" />
            </Field>
            <Field label="Contact email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} placeholder="matt@example.com" />
            </Field>
          </div>
          <Field label="Internal notes" htmlFor="notes" hint="Visible to the agency team only.">
            <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} placeholder="Content cadence, goals, key contacts…" />
          </Field>
          {!editing ? <FormMessage state={state} /> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{editing ? "Save changes" : "Create client"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
