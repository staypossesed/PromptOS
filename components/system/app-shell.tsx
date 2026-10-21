import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-content">
        <AppTopbar />
        <main id="main" className="app-main">{children}</main>
      </div>
    </div>
  );
}
