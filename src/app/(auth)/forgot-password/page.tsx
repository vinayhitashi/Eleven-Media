"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted">We’ll email you a secure link to choose a new password.</p>
      <form action={action} className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <FormMessage state={state} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>Send reset link</Button>
        <p className="text-center text-[13px]">
          <Link href="/login" className="text-muted underline-offset-4 hover:text-fg hover:underline">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
