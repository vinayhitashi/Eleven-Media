"use client";

import { useActionState, useState } from "react";
import { FileBarChart } from "lucide-react";
import { generateReportAction } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";

function lastMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export function GenerateReportDialog({
  clients,
  defaultClientId,
  defaultOpen = false,
  variant = "primary",
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string | null;
  defaultOpen?: boolean;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(generateReportAction, null);
  const maxMonth = new Date().toISOString().slice(0, 7);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} disabled={!clients.length}>
        <FileBarChart /> Generate report
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Generate monthly report" description="Computed from stored daily snapshots, then frozen so a sent report never changes. You can preview before publishing.">
        <form action={action} className="space-y-4">
          <Field label="Client" htmlFor="rep-client">
            <Select id="rep-client" name="clientId" defaultValue={defaultClientId ?? clients[0]?.id} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Month" htmlFor="rep-month" hint="Regenerating an existing month replaces it and returns it to draft.">
            <Input id="rep-month" name="month" type="month" defaultValue={lastMonth()} max={maxMonth} required />
          </Field>
          <FormMessage state={state} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>Generate & preview</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
