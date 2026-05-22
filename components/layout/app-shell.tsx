import { Sidebar } from "@/components/layout/sidebar";
import { PaywallModalContainer } from "@/components/billing/paywall-modal-container";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
      <PaywallModalContainer />
    </div>
  );
}
