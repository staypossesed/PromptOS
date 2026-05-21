import { redirect } from "next/navigation";
import { Mail, Zap, Shield, LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { listPrompts } from "@/lib/prompts";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { LanguageSelector } from "@/components/settings/language-selector";
import { getServerTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prompts } = await listPrompts(200);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayPrompts = prompts.filter(p => new Date(p.created_at).getTime() >= todayStart.getTime()).length;
  const DAILY_LIMIT = 20;
  const usagePercent = Math.min((todayPrompts / DAILY_LIMIT) * 100, 100);
  const { t } = await getServerTranslations();

  return (
    <AppShell>
      <PageViewTracker event="settings_opened" />
      <Topbar breadcrumb={[{ label: t("nav.workspace") }, { label: t("nav.settings") }]} />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-1">
            {t("settings.title")}
          </h1>
          <p className="text-ink-500 text-[15px]">{t("settings.subtitle")}</p>
        </div>

        <div className="space-y-4">
          {/* Account section */}
          <Section title={t("settings.accountSection")} icon={Mail}>
            <Row label={t("settings.email")} value={user.email ?? "—"} />
            <Row label={t("settings.userId")} value={user.id.slice(0, 8) + "…"} mono />
            <Row
              label={t("settings.memberSince")}
              value={new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            />
          </Section>

          {/* Plan section */}
          <Section title={t("settings.planSection")} icon={Zap}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">{t("settings.currentPlan")}</span>
                <span className="text-sm font-semibold text-ink-900">{t("settings.freePlan")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">{t("settings.promptsToday")}</span>
                <span className="text-sm font-mono text-ink-700">
                  {todayPrompts} / {DAILY_LIMIT}
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
                  {t("settings.promptsRemaining", { n: DAILY_LIMIT - todayPrompts })}
                </p>
              </div>
            </div>
          </Section>

          {/* Security section */}
          <Section title={t("settings.securitySection")} icon={Shield}>
            <Row label={t("settings.authentication")} value={t("settings.authValue")} />
            <Row label={t("settings.session")} value={t("settings.sessionActive")} />
          </Section>

          {/* Language selector (client component) */}
          <LanguageSelector />

          {/* Sign out */}
          <div className="pt-2">
            <form action={signOut}>
              <Button type="submit" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20">
                <LogOut className="size-4" />
                {t("settings.signOut")}
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
