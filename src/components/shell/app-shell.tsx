"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, FileText, LayoutGrid, LibraryBig, LogOut, Menu, Plug, Settings, Users, X } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Wordmark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV: { href: string; label: string; icon: typeof LayoutGrid; roles: UserRole[]; section: "main" | "manage" }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, roles: ["admin", "client"], section: "main" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "client"], section: "main" },
  { href: "/content", label: "Content", icon: LibraryBig, roles: ["admin", "client"], section: "main" },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "client"], section: "main" },
  { href: "/clients", label: "Clients", icon: Users, roles: ["admin"], section: "manage" },
  { href: "/integrations", label: "Integrations", icon: Plug, roles: ["admin", "client"], section: "manage" },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "client"], section: "manage" },
];

export interface ShellUser {
  name: string | null;
  email: string;
  role: UserRole;
  workspace: string | null;
}

function NavList({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = [
    { key: "main", label: "Insights" },
    { key: "manage", label: role === "admin" ? "Agency" : "Account" },
  ] as const;
  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {sections.map((sec) => (
        <div key={sec.key}>
          <div className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-sidebar-muted/70">{sec.label}</div>
          <div className="flex flex-col gap-0.5">
            {NAV.filter((n) => n.section === sec.key && n.roles.includes(role)).map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg",
                    active && "bg-[linear-gradient(90deg,rgba(47,227,138,0.14),rgba(47,227,138,0.02))] text-sidebar-fg",
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]" aria-hidden /> : null}
                  <Icon className={cn("size-4 transition-colors group-hover:text-sidebar-fg", active ? "text-accent" : "text-sidebar-muted")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-7 pt-1">
        <Link href="/dashboard" onClick={onNavigate}>
          <Wordmark onDark />
        </Link>
      </div>
      {user.role === "client" && user.workspace ? (
        <div className="mx-1 mb-6 rounded-xl border border-sidebar-border bg-white/[0.03] px-3 py-2.5">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-sidebar-muted">Workspace</div>
          <div className="truncate text-[13px] font-medium text-sidebar-fg">{user.workspace}</div>
        </div>
      ) : null}
      <NavList role={user.role} onNavigate={onNavigate} />
      <div className="mt-auto space-y-3 pt-6">
        <ThemeToggle onDark className="w-full" />
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-white/[0.03] p-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">{initials(user.name ?? user.email)}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-sidebar-fg">{user.name ?? user.email}</div>
            <div className="truncate text-[11.5px] text-sidebar-muted">{user.role === "admin" ? "Agency admin" : "Client"}</div>
          </div>
          <form action={signOut}>
            <button type="submit" className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar — always black */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] border-r border-sidebar-border bg-sidebar px-3 py-5 lg:block">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(80%_60%_at_20%_0%,rgba(47,227,138,0.12),transparent)]" aria-hidden />
        <div className="relative h-full">
          <SidebarContent user={user} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Link href="/dashboard">
          <Wordmark onDark />
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-hover" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[284px] animate-fade-in border-r border-sidebar-border bg-sidebar px-3 py-5">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-hover" aria-label="Close menu">
              <X className="size-4" />
            </button>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-[252px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
