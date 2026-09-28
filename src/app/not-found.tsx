import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
        <p className="mt-2 text-sm text-muted">Or you don’t have access to it.</p>
        <ButtonLink href="/dashboard" className="mt-6">Back to dashboard</ButtonLink>
      </div>
    </main>
  );
}
