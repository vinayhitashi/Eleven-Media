import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { PasswordForm, ProfileForm } from "@/components/settings/forms";
import { InviteAdminDialog } from "@/components/settings/invite-admin-dialog";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { listAdmins } from "@/lib/data";
import { configStatus } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const isAdmin = viewer.role === "admin";
  const admins = isAdmin ? await listAdmins(viewer) : [];
  const cfg = configStatus();
  const checks = [
    { label: "Supabase database & auth", ok: cfg.supabase, env: "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY" },
    { label: "Server service role", ok: cfg.serviceRole, env: "SUPABASE_SERVICE_ROLE_KEY" },
    { label: "Token encryption key", ok: cfg.encryptionKey, env: "TOKEN_ENCRYPTION_KEY" },
    { label: "Google OAuth (YouTube)", ok: cfg.googleOAuth, env: "GOOGLE_CLIENT_ID / SECRET" },
    { label: "YouTube public API key", ok: cfg.youtubeApiKey, env: "YOUTUBE_API_KEY (optional)" },
    { label: "Daily sync cron secret", ok: cfg.cronSecret, env: "CRON_SECRET" },
  ];

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, security and application preferences." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile" />
            <CardBody><ProfileForm name={viewer.name} email={viewer.email} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Password" description="At least 10 characters." />
            <CardBody><PasswordForm /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Appearance" description="Light, dark, or follow your system." />
            <CardBody><ThemeToggle className="w-44" /></CardBody>
          </Card>
          {isAdmin ? (
            <Card>
              <CardHeader title="Agency team" description="Admins can see and manage every client workspace." action={<InviteAdminDialog />} />
              <CardBody className="pt-3">
                <ul className="divide-y divide-border text-[13px]">
                  {admins.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="font-medium">{a.name ?? a.email}</div>
                        <div className="text-subtle">{a.email}</div>
                      </div>
                      <span className="text-[12px] text-subtle">since {formatDate(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {isAdmin ? (
            <Card>
              <CardHeader title="System status" description="Server configuration (values are never displayed)" />
              <CardBody className="pt-3">
                <ul className="space-y-2.5 text-[13px]">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-start gap-2.5">
                      {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-subtle" />}
                      <div>
                        <div className={c.ok ? "text-fg" : "text-muted"}>{c.label}</div>
                        <div className="font-mono text-[11px] text-subtle">{c.env}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/integrations" className="mt-4 inline-block text-[13px] font-medium underline underline-offset-4">Manage integrations →</Link>
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Data principles" />
            <CardBody className="pt-3 text-[13px] leading-relaxed text-muted">
              <ul className="list-disc space-y-1.5 pl-4">
                <li>Analytics come only from official platform APIs — no scraping.</li>
                <li>If a platform doesn’t provide a metric, it’s shown as “Not available”, never estimated.</li>
                <li>Period figures come from daily historical snapshots.</li>
                <li>Channel subscriber totals are never assigned to individual videos.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
