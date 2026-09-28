"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/types";

/** Surfaces a server action's result as a toast (once per new result). */
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const last = useRef<ActionState>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.error) toast.error(state.error);
    else if (state.message) {
      toast.success(state.message);
      onSuccess?.();
    }
  }, [state, onSuccess]);
}

/** Runs a plain (non-form) server action and toasts the result. */
export async function runAction(fn: () => Promise<ActionState>) {
  try {
    const res = await fn();
    if (res?.error) toast.error(res.error);
    else if (res?.message) toast.success(res.message);
    return res;
  } catch (err) {
    // Redirects thrown by server actions are handled by Next.js; anything else is a real error.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw err;
    toast.error("Something went wrong. Please try again.");
    return null;
  }
}
