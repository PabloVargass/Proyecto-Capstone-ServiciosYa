import { requireAdmin } from "@/auth/session";
import { PanelShell } from "@/components/PanelShell";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return <PanelShell user={user}>{children}</PanelShell>;
}
