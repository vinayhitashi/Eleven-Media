import { AppShell } from "@/components/shell/app-shell";
import { requireViewer } from "@/lib/auth";
import { getClient } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const workspace = viewer.role === "client" && viewer.client_id ? await getClient(viewer, viewer.client_id) : null;
  return (
    <AppShell
      user={{ name: viewer.name, email: viewer.email, role: viewer.role, workspace: workspace?.company ?? workspace?.name ?? null }}
    >
      {children}
    </AppShell>
  );
}
