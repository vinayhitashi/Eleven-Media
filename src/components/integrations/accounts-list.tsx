import type { SocialAccountWithClient } from "@/lib/data";
import { PLATFORM_META } from "@/platforms/meta";
import { Badge } from "@/components/ui/badge";
import { initials, relativeTime } from "@/lib/utils";
import { AccountActions } from "./account-actions";

const STATUS = {
  connected: { tone: "good", label: "Connected" },
  expired: { tone: "warn", label: "Reconnect needed" },
  error: { tone: "bad", label: "Error" },
  disconnected: { tone: "neutral", label: "Disconnected" },
} as const;

export function AccountsList({ accounts, showClient, canManage }: { accounts: SocialAccountWithClient[]; showClient?: boolean; canManage: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {accounts.map((a) => {
        const s = STATUS[a.status];
        return (
          <li key={a.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt="" className="size-10 rounded-full border border-border" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold">{initials(a.account_name)}</span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{a.account_name ?? a.platform_account_id}</span>
                  <span className="flex items-center gap-1 text-[12px] text-subtle">
                    <span className="size-1.5 rounded-full" style={{ background: PLATFORM_META[a.platform].color }} />
                    {PLATFORM_META[a.platform].label}
                  </span>
                  <Badge tone={s.tone} dot>{s.label}</Badge>
                </div>
                <div className="mt-0.5 truncate text-[12.5px] text-subtle">
                  {showClient ? <>{a.client_name} · </> : null}
                  {a.account_handle ?? a.platform_account_id} · Last sync {relativeTime(a.last_synced_at)}
                </div>
                {a.last_sync_error ? <div className="mt-1 line-clamp-2 text-[12px] text-warn">{a.last_sync_error}</div> : null}
              </div>
            </div>
            {canManage && a.status !== "disconnected" ? <AccountActions accountId={a.id} canImport={a.platform === "youtube"} /> : null}
            {canManage && (a.status === "expired" || a.status === "disconnected") ? (
              <a href={`/api/integrations/${a.platform}/connect?clientId=${a.client_id}`} className="text-[13px] font-medium underline underline-offset-4">Reconnect</a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
