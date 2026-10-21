import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { Button } from "@/components/system/button";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { PageViewTracker } from "@/components/system/page-view-tracker";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { getBillingStatus, planDisplayName } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const billing = await getBillingStatus(supabase, user.id);
  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  const providerLabel = provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Magic link";
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const planName = planDisplayName(billing.plan, billing.isFounder);

  return (
    <AppShell>
      <PageViewTracker event="account_opened" />
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / Account</p>
          <h1 className="app-head__title">Your account.</h1>
          <p className="app-head__sub">The facts of the account, the plan, and the language.</p>
        </div>
      </header>

      <div className="account-grid">
        <section className="stack">
          <h2 className="sheet__title">Profile</h2>
          <div className="account-row"><span className="account-row__label">Email</span><span>{user.email ?? "–"}</span></div>
          <div className="account-row"><span className="account-row__label">Member since</span><span>{memberSince}</span></div>
          <div className="account-row"><span className="account-row__label">Signed in with</span><span>{providerLabel}</span></div>
        </section>

        <section className="stack--loose stack">
          <div className="stack">
            <h2 className="sheet__title">Plan</h2>
            <div className="account-row"><span className="account-row__label">Current plan</span><span>{planName}</span></div>
            <div className="account-row">
              <span className="account-row__label">{billing.isPaid ? "Status" : "This week"}</span>
              <span>{billing.isPaid ? "Active" : `${billing.usedThisWeek} of ${billing.weeklyLimit} used`}</span>
            </div>
            {!billing.isPaid ? (
              <p className="small muted">{billing.remainingThisWeek ?? 0} free prompts left this week.</p>
            ) : null}
            <div className="composer__actions">
              {billing.isPaid ? <BillingPortalButton /> : <Link href="/plan" className="button button--accent button--small">See the plans</Link>}
            </div>
          </div>

          <div className="stack">
            <h2 className="sheet__title">Shortcuts</h2>
            <div className="composer__actions">
              <Link href="/builder" className="button button--ghost button--small">Builder</Link>
              <Link href="/history" className="button button--ghost button--small">History</Link>
              <Link href="/templates" className="button button--ghost button--small">Templates</Link>
            </div>
          </div>

          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">Sign out</Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
