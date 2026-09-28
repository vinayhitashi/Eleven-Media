"use client";

import { useTransition } from "react";
import { Download, RefreshCw, Unplug } from "lucide-react";
import { disconnectAccountAction, syncAccountNowAction } from "@/lib/actions/integrations";
import { importRecentContentAction } from "@/lib/actions/content";
import { Button } from "@/components/ui/button";
import { runAction } from "@/components/ui/use-action-toast";

export function AccountActions({ accountId, canImport }: { accountId: string; canImport: boolean }) {
  const [syncing, startSync] = useTransition();
  const [importing, startImport] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="secondary" loading={syncing} onClick={() => startSync(async () => void (await runAction(() => syncAccountNowAction(accountId))))}>
        {!syncing ? <RefreshCw /> : null} Sync now
      </Button>
      {canImport ? (
        <Button size="sm" variant="ghost" loading={importing} onClick={() => startImport(async () => void (await runAction(() => importRecentContentAction(accountId))))}>
          {!importing ? <Download /> : null} Import recent uploads
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        loading={disconnecting}
        onClick={() => {
          if (!window.confirm("Disconnect this account? Stored credentials are deleted; metric history is kept.")) return;
          startDisconnect(async () => void (await runAction(() => disconnectAccountAction(accountId))));
        }}
      >
        {!disconnecting ? <Unplug /> : null} Disconnect
      </Button>
    </div>
  );
}
