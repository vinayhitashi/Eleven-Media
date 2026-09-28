"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

/** Used both for password recovery and for invited users setting their first password. */
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Choose a password</h1>
      <p className="mt-1.5 text-sm text-muted">At least 10 characters. You’ll be signed in afterwards.</p>
      <form action={action} className="mt-8 space-y-4">
        <Field label="New password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <FormMessage state={state} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>Save password</Button>
      </form>
    </div>
  );
}
