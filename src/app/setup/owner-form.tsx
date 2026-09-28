"use client";

import { useActionState } from "react";
import { createOwnerAction } from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

export function OwnerForm() {
  const [state, action, pending] = useActionState(createOwnerAction, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" htmlFor="name">
        <Input id="name" name="name" required autoFocus placeholder="Anuraj Sharma" />
      </Field>
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@elevenmedia.com" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
        </Field>
        <Field label="Confirm" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
        </Field>
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Create owner account</Button>
      <p className="text-center text-[12px] text-subtle">This screen locks permanently once the owner account exists.</p>
    </form>
  );
}
