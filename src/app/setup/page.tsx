import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Database, KeyRound, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/shell/logo";
import { ButtonLink } from "@/components/ui/button";
import { getSetupState } from "@/lib/setup";
import { cn } from "@/lib/utils";
import { OwnerForm } from "./owner-form";

export const metadata: Metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

function Step({ n, title, done, active, children }: { n: number; title: string; done: boolean; active: boolean; children?: React.ReactNode }) {
  return (
    <li className={cn("relative rounded-2xl border p-5 transition-colors", active ? "border-[var(--accent-glow)] bg-surface shadow-glow" : "border-border bg-surface/60")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold", done ? "bg-accent text-accent-fg" : active ? "border border-accent text-accent-text" : "border border-border-strong text-subtle")}>
          {done ? <CheckCircle2 className="size-4" /> : n}
        </span>
        <h2 className={cn("text-[15px] font-semibold", !done && !active && "text-muted")}>{title}</h2>
        {done ? <span className="ml-auto text-[12px] font-medium text-accent-text">Done</span> : null}
      </div>
      {active && children ? <div className="mt-4 pl-10">{children}</div> : null}
    </li>
  );
}

function EnvRow({ ok, name, note }: { ok: boolean; name: string; note: string }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-text" /> : <Circle className="mt-0.5 size-4 shrink-0 text-subtle" />}
      <div>
        <code className="font-mono text-[12.5px] text-fg">{name}</code>
        <div className="text-[12px] text-subtle">{note}</div>
      </div>
    </li>
  );
}

export default async function SetupPage() {
  const state = await getSetupState();
  if (state.configured && state.dbReady && state.hasAdmin) redirect("/login");
  const c = state.checks;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="brand-backdrop border-b border-sidebar-border">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 pb-12 pt-8">
          <Wordmark onDark />
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#2fe38a]">First-time setup</p>
            <h1 className="text-gradient-brand mt-3 text-[34px] font-semibold leading-tight tracking-[-0.025em]">Let’s get Eleven Growth running.</h1>
            <p className="mt-2 max-w-xl text-[15px] text-white/55">Three steps: connect the database, install the schema, create the owner account. Everything after that happens inside the app.</p>
          </div>
        </div>
      </div>

      <ol className="mx-auto -mt-6 max-w-3xl space-y-3 px-6 pb-16">
        <Step n={1} title="Connect Supabase" done={state.configured} active={!state.configured}>
          <p className="mb-3 text-[13px] text-muted">
            Create a free project at supabase.com, then add these to <code className="rounded bg-surface-2 px-1">.env.local</code> (or Vercel → Environment Variables) and restart the server.
          </p>
          <ul className="rounded-xl border border-border bg-surface-2/50 px-4 py-2">
            <EnvRow ok={c.supabase} name="NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY" note="Supabase → Project Settings → API" />
            <EnvRow ok={c.serviceRole} name="SUPABASE_SERVICE_ROLE_KEY" note="Same page. Server-only — never exposed to browsers." />
            <EnvRow ok={c.encryptionKey} name="TOKEN_ENCRYPTION_KEY" note="Run: openssl rand -base64 32" />
          </ul>
        </Step>

        <Step n={2} title="Install the database schema" done={state.dbReady} active={state.configured && !state.dbReady}>
          <div className="flex items-start gap-3 text-[13px] text-muted">
            <Database className="mt-0.5 size-4 shrink-0 text-accent-text" />
            <p>
              In Supabase → SQL Editor, paste and run <code className="rounded bg-surface-2 px-1">supabase/migrations/20260928000000_init.sql</code> from this project, then refresh this page.
              {state.dbError ? <span className="mt-2 block font-mono text-[11.5px] text-bad">{state.dbError}</span> : null}
            </p>
          </div>
        </Step>

        <Step n={3} title="Create the owner account" done={state.hasAdmin} active={state.configured && state.dbReady && !state.hasAdmin}>
          <div className="max-w-md">
            <OwnerForm />
          </div>
        </Step>

        <li className="rounded-2xl border border-border bg-surface/60 p-5">
          <div className="flex items-center gap-3">
            <KeyRound className="size-4 text-accent-text" />
            <h2 className="text-[15px] font-semibold">Then, inside the app</h2>
          </div>
          <ul className="mt-3 space-y-1.5 pl-7 text-[13px] text-muted">
            <li>Add <code className="rounded bg-surface-2 px-1">GOOGLE_CLIENT_ID</code> / <code className="rounded bg-surface-2 px-1">GOOGLE_CLIENT_SECRET</code> to connect YouTube channels (see README).</li>
            <li>Optionally add <code className="rounded bg-surface-2 px-1">YOUTUBE_API_KEY</code> to track public videos without OAuth.</li>
            <li>Create clients, connect channels, and invite your clients to their private dashboards.</li>
          </ul>
        </li>
        <div className="flex items-center justify-between gap-4 pt-2 text-[12.5px] text-subtle">
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent-text" /> Secrets are checked for presence only — never displayed.</span>
          {state.hasAdmin ? <ButtonLink href="/login">Go to sign in</ButtonLink> : null}
        </div>
      </ol>
    </div>
  );
}
