import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Admin Console — Umprompt",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminUser();

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Admin sidebar */}
      <aside className="hidden lg:flex h-screen w-56 shrink-0 flex-col border-r border-ink-100/70 bg-cream-50/60 sticky top-0">
        <div className="flex h-14 items-center px-4 border-b border-ink-100/60 gap-2">
          <Link href="/dashboard" className="flex items-center">
            <Logo />
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-clay-600 border border-clay-200/60 bg-clay-500/5 rounded px-1.5 py-0.5">
            Admin
          </span>
        </div>

        <AdminNav />

        <div className="border-t border-ink-100/60 px-4 py-3">
          <div className="text-[10px] text-ink-400 truncate">{admin.email}</div>
          <Link
            href="/dashboard"
            className="mt-1 text-[11px] text-ink-500 hover:text-ink-800 transition-colors"
          >
            Back to app
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
