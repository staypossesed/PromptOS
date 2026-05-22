import { redirect } from "next/navigation";
import { Mail, Zap, Link2, Wand2, History, Settings, LogOut, Crown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { getServerTranslations } from "@/lib/i18n/server";
import { getBillingStatus, planDisplayName } from "@/lib/billing";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { t } = await getServerTranslations();
  const billing = await getBillingStatus(supabase, user.id);

  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  const providerLabel =
    provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Magic link";

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const planName = planDisplayName(billing.plan, billing.isFounder);

  return (
    <AppShell>
      <PageViewTracker event="account_opened" />
      <Topbar breadcrumb={[{ label: t("nav.workspace") }, { label: t("nav.account") }]} />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-1">
            {t("account.title")}
          </h1>
          <p className="text-ink-500 text-[15px]">{t("account.subtitle")}</p>
        </div>

        <div className="space-y-4">
          {/* Profile */}
          <Section title={t("account.profileSection")} icon={Mail}>
            <Row label={t("account.email")} value={user.email ?? "—"} />
            <Row label={t("account.memberSince")} value={memberSince} />
            <Row label={t("account.signedInWith")} value={providerLabel} />
          </Section>

          {/* Plan & usage */}
          <Section
            title={t("account.planSection")}
            icon={Zap}
            badge={billing.isFounder ? t("billing.founderBadge") : billing.isLifetime ? t("billing.lifetimeBadge") : undefined}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">{t("billing.currentPlan")}</span>
                <span className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
                  {billing.isFounder && <Crown className="size-3.5 text-clay-600" />}
                  {planName}
                </span>
              </div>

              {billing.isPaid ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-600">{t("billing.planStatus")}</span>
                  <span className="text-sm font-medium text-green-700">{t("billing.planActive")}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-600">{t("account.promptsToday")}</span>
                    <span className="text-sm font-mono text-ink-700">
                      {billing.usedThisWeek} / {billing.weeklyLimit}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-cream-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-clay-500 transition-all"
                        style={{
                          width: `${Math.min((billing.usedThisWeek / (billing.weeklyLimit ?? 7)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-ink-400">
                      {t("account.promptsRemaining", { n: billing.remainingThisWeek ?? 0 })}
                    </p>
                  </div>
                </>
              )}

              {billing.isPaid ? (
                <div className="pt-1 flex gap-2">
                  <BillingPortalButton label={t("billing.manageBilling")} />
                </div>
              ) : (
                <div className="pt-1">
                  <Button asChild size="sm" className="text-sm">
                    <Link href="/plan">
                      <Zap className="size-3.5" />
                      {t("billing.upgradeToPro")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </Section>

          {/* Quick links */}
          <Section title={t("account.quickLinksSection")} icon={Link2}>
            <div className="flex flex-col gap-1">
              <QuickLink href="/builder" icon={Wand2} label={t("account.goToBuilder")} />
              <QuickLink href="/history" icon={History} label={t("account.goToHistory")} />
              <QuickLink href="/settings" icon={Settings} label={t("account.goToSettings")} />
              <QuickLink href="/plan" icon={ExternalLink} label={t("nav.plan")} />
            </div>
          </Section>

          {/* Sign out */}
          <div className="pt-2">
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
              >
                <LogOut className="size-4" />
                {t("account.signOut")}
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
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-[0.1em]">{title}</h2>
        {badge && (
          <span className="text-[10px] uppercase tracking-wider text-clay-700 bg-clay-500/10 border border-clay-500/20 rounded-full px-1.5 py-0.5 font-medium">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-sm font-medium text-ink-800">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-cream-100 transition-colors"
    >
      <Icon className="size-4 shrink-0 text-ink-400" />
      {label}
    </Link>
  );
}
