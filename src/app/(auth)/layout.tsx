import { Wordmark } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="brand-backdrop relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#2fe38a] text-[#03140a] shadow-[0_0_30px_-4px_rgba(47,227,138,0.6)]">
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <rect x="6" y="4" width="3.2" height="16" rx="0.6" />
              <rect x="14.8" y="4" width="3.2" height="16" rx="0.6" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold tracking-tight">Eleven Growth</span>
        </div>

        {/* Decorative growth curve */}
        <svg className="pointer-events-none absolute -right-6 top-28 h-[340px] w-[600px]" viewBox="0 0 600 340" fill="none" aria-hidden>
          <defs>
            <linearGradient id="authArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2fe38a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2fe38a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 300 C 90 290, 140 260, 200 240 S 300 200, 350 150 S 470 70, 600 20 L 600 340 L 0 340 Z" fill="url(#authArea)" />
          <path d="M0 300 C 90 290, 140 260, 200 240 S 300 200, 350 150 S 470 70, 600 20" stroke="#2fe38a" strokeWidth="2.5" />
          <circle cx="350" cy="150" r="5" fill="#2fe38a" />
          <circle cx="350" cy="150" r="12" fill="#2fe38a" fillOpacity="0.2" />
        </svg>

        <div className="relative mt-auto max-w-md">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#2fe38a]">Eleven Media</p>
          <h2 className="text-gradient-brand mt-4 text-[38px] font-semibold leading-[1.08] tracking-[-0.025em]">
            Every view, every subscriber, every month — accounted for.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/55">
            Client growth tracking and reporting built on official platform APIs and daily historical snapshots.
          </p>
          <div className="mt-8 flex gap-8 text-[13px] text-white/50">
            <div><div className="text-lg font-semibold text-white">Daily</div>snapshots</div>
            <div><div className="text-lg font-semibold text-white">OAuth</div>read-only access</div>
            <div><div className="text-lg font-semibold text-white">PDF</div>client reports</div>
          </div>
        </div>
        <div className="relative mt-12 text-[12px] text-white/35">© {new Date().getFullYear()} Eleven Media</div>
      </aside>
      <main className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Wordmark />
          </span>
          <ThemeToggle className="w-[108px]" />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </main>
    </div>
  );
}
