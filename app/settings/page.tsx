import { redirect } from "next/navigation";
import { Mail, Zap, Shield, LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { listPrompts } from "@/lib/prompts";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prompts } = await listPrompts(200);
  const totalPrompts = prompts.length;
  const MONTHLY_LIMIT = 20;
  const usagePercent = Math.min((totalPrompts / MONTHLY_LIMIT) * 100, 100);

  return (
    <AppShell>
      <PageViewTracker event="settings_opened" />
      <Topbar breadcrumb={[{ label: "Workspace" }, { label: "Settings" }]} />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-1">
            Settings
          </h1>
          <p className="text-ink-500 text-[15px]">Manage your account and preferences.</p>
        </div>

        <div className="space-y-4">
          {/* Account section */}
          <Section title="Account" icon={Mail}>
            <Row label="Email" value={user.email ?? "—"} />
            <Row label="User ID" value={user.id.slice(0, 8) + "…"} mono />
            <Row
              label="Member since"
              value={new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            />
          </Section>

          {/* Plan section */}
          <Section title="Plan" icon={Zap}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">Current plan</span>
                <span className="text-sm font-semibold text-ink-900">Free</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">Prompts this month</span>
                <span className="text-sm font-mono text-ink-700">
                  {totalPrompts} / {MONTHLY_LIMIT}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-clay-500 transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-ink-400">
                  {MONTHLY_LIMIT - totalPrompts} prompts remaining this month
                </p>
              </div>
            </div>
          </Section>

          {/* Security section */}
          <Section title="Security" icon={Shield}>
            <Row label="Authentication" value="Magic link (passwordless)" />
            <Row label="Session" value="Active" />
          </Section>

          {/* Sign out */}
          <div className="pt-2">
            <form action={signOut}>
              <Button type="submit" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-[0.1em]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`text-sm text-ink-800 ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}
