import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { DailyDashboard } from "@/components/dashboard/daily-dashboard";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import { getServerTranslations } from "@/lib/i18n/server";
import { deliveryFilter, filterSavedPrompts } from "@/lib/prompt-history";
import type { WorkspaceItem } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string; delivery?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  const { q = "", delivery } = await searchParams;
  const selected = deliveryFilter(delivery);
  const [saved, workspace, { t }] = await Promise.all([
    listPrompts(200, db),
    db.from("workspace_items").select("id, kind, name, payload, updated_at").eq("user_id", user.id).eq("kind", "playbook").order("updated_at", { ascending: false }),
    getServerTranslations(),
  ]);
  return <AppShell><Topbar breadcrumb={[{label:t("nav.dashboard")}]} />
    <DailyDashboard ownerId={user.id} prompts={filterSavedPrompts(saved.data,q,selected)} favorites={(workspace.data ?? []) as WorkspaceItem[]} query={q} delivery={selected} error={!!saved.error} favoriteError={!!workspace.error}/>
  </AppShell>;
}
