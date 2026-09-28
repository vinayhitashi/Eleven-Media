"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useActionToast } from "@/components/ui/use-action-toast";

export function ProfileForm({ name, email }: { name: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name">
          <Input id="name" name="name" defaultValue={name ?? ""} required />
        </Field>
        <Field label="Email" htmlFor="email" hint="Contact Eleven Media to change your sign-in email.">
          <Input id="email" defaultValue={email} disabled />
        </Field>
      </div>
      <Button type="submit" variant="secondary" loading={pending}>Save profile</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirm" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
      </div>
      <Button type="submit" variant="secondary" loading={pending}>Update password</Button>
    </form>
  );
}
