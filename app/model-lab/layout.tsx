import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function ModelLabLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAdminUser(user.email)) redirect("/dashboard");

  return (
    <div className="app-shell">
      <AdminNav />
      <main id="main" className="app-main">{children}</main>
    </div>
  );
}
