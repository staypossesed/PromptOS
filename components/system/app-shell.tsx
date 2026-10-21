import { AppNav } from "./app-nav";
import { Footer } from "./footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppNav />
      <main id="main" className="app-main">
        <div className="wrap">{children}</div>
      </main>
      <Footer strip />
    </div>
  );
}
