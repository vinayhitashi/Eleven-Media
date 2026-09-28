import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getSetupState } from "@/lib/setup";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const setup = await getSetupState();
  if (!setup.configured || !setup.dbReady || !setup.hasAdmin) redirect("/setup");
  return (
    <div className="animate-fade-in">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-text">Welcome back</p>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Sign in to Eleven Growth</h1>
      <p className="mt-1.5 text-sm text-muted">Agency team and clients use the same sign-in. Your access is set by your invitation.</p>
      {sp.error ? <p className="mt-6 rounded-lg bg-bad-bg px-3 py-2 text-[13px] text-bad">That link is invalid or has expired. Please try again.</p> : null}
      <LoginForm next={sp.next ?? "/dashboard"} />
      <p className="mt-8 text-center text-[12px] text-subtle">
        Need access? Ask your Eleven Media contact for an invitation. <Link href="/forgot-password" className="text-muted hover:text-fg">Reset password</Link>
      </p>
    </div>
  );
}
