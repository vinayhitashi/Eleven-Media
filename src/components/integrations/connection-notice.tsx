import { AlertTriangle, CheckCircle2 } from "lucide-react";

const ERRORS: Record<string, string> = {
  not_configured: "The server isn’t fully configured yet. Finish the steps on the setup screen first.",
  oauth_not_configured: "Google OAuth isn’t configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  invalid_state: "The connection request expired or was tampered with. Please try again.",
  access_denied: "Access was not granted. The account owner needs to approve read-only access.",
  forbidden: "You don’t have permission to connect accounts for this client.",
  signed_out: "Your session expired during the connection. Please sign in and try again.",
};

const WARNINGS: Record<string, string> = {
  analytics_scope_missing: "Connected, but YouTube Analytics access wasn’t granted — subscribers gained and shares will show as Not available. Reconnect and tick all permissions.",
  initial_sync_failed: "Connected, but the first sync failed. It will retry automatically tonight, or use “Sync now”.",
};

export function ConnectionNotice({ connected, error, warning }: { connected?: string; error?: string; warning?: string }) {
  if (!connected && !error) return null;
  if (error) {
    return (
      <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl bg-bad-bg px-4 py-3 text-[13px] text-bad">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{ERRORS[error] ?? `Connection failed: ${error}`}</span>
      </div>
    );
  }
  return (
    <div role="status" className={`mb-6 flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px] ${warning ? "bg-warn-bg text-warn" : "bg-good-bg text-good"}`}>
      {warning ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <span>{warning ? (WARNINGS[warning] ?? warning) : `${connected === "youtube" ? "YouTube" : connected} connected. Historical analytics were backfilled and daily snapshots are now scheduled.`}</span>
    </div>
  );
}
