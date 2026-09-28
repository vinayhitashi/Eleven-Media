"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle({ className, onDark }: { className?: string; onDark?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-lg border p-0.5", onDark ? "border-sidebar-border bg-white/[0.03]" : "border-border bg-surface-2", className)}>
      {options.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "grid h-7 flex-1 place-items-center rounded-md px-2 transition-colors",
              onDark ? "text-sidebar-muted hover:text-sidebar-fg" : "text-subtle hover:text-fg",
              active && (onDark ? "bg-white/[0.08] text-accent" : "bg-surface text-accent-text shadow-card"),
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
