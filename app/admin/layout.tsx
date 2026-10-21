import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminNav />
      <main id="main" className="app-main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
