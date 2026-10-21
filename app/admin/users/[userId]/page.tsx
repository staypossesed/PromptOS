import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin = await requireAdminUser();
  const { userId } = await params;
  const db = createAdminClient();

  const { data: authUserData, error: authErr } = await db.auth.admin.getUserById(userId);
  if (authErr || !authUserData?.user) notFound();
  const authUser = authUserData.user;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: sub },
    { data: stripeCustomer },
    { data: generationRuns },
    { data: savedPrompts },
    { data: promptPacks },
    { data: feedbackItems },
    { count: weekUsage },
  ] = await Promise.all([
    db.from("billing_subscriptions").select("*").eq("user_id", userId).in("status", ["active", "trialing"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("billing_customers").select("stripe_customer_id, created_at").eq("user_id", userId).maybeSingle(),
    db.from("generation_runs").select("id, mode, target_tool, pack_type, status, user_idea, generated_output, score, error_message, latency_ms, input_chars, output_chars, saved_prompt_id, saved_pack_id, output_language, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db.from("prompts").select("id, title, idea, target_tool, score, generated_prompt, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    db.from("prompt_packs").select("id, title, idea, pack_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    db.from("feedback").select("id, message, page, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    db.from("usage_events").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sevenDaysAgo),
  ]);

  void insertAuditLog({ adminUserId: admin.id, adminEmail: admin.email, action: "admin_view_user", targetUserId: userId });

  const plan: PlanType = (sub?.plan as PlanType) ?? "free";
  const planLabel = planDisplayName(plan, sub?.is_founder ?? false);
  const provider = (authUser.app_metadata?.provider as string) ?? "email";

  return (
    <>
      <p className="small muted"><Link href="/admin/users">Users</Link> / {authUser.email}</p>
      <header className="app-head">
        <div className="stack">
          <h1 className="app-head__title" style={{ fontSize: "clamp(34px, 4vw, 56px)", overflowWrap: "anywhere" }}>{authUser.email}</h1>
          <p className="app-head__sub">{planLabel} · {provider}</p>
        </div>
      </header>

      <section className="sheet">
        <div className="sheet__head"><h2 className="sheet__title">Profile</h2></div>
        <div className="account-row"><span className="account-row__label">User ID</span><span><code>{authUser.id}</code></span></div>
        <div className="account-row"><span className="account-row__label">Joined</span><span>{new Date(authUser.created_at).toLocaleString()}</span></div>
        <div className="account-row"><span className="account-row__label">Last sign-in</span><span>{authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : "–"}</span></div>
        <div className="account-row"><span className="account-row__label">Used this week</span><span>{weekUsage ?? 0}</span></div>
        <div className="account-row"><span className="account-row__label">Saved prompts</span><span>{savedPrompts?.length ?? 0}</span></div>
        <div className="account-row"><span className="account-row__label">Prompt packs</span><span>{promptPacks?.length ?? 0}</span></div>
      </section>

      <section className="sheet" style={{ marginTop: 24 }}>
        <div className="sheet__head"><h2 className="sheet__title">Billing</h2></div>
        {sub ? (
          <>
            <div className="account-row"><span className="account-row__label">Plan</span><span>{planLabel}</span></div>
            <div className="account-row"><span className="account-row__label">Status</span><span>{sub.status}</span></div>
            <div className="account-row"><span className="account-row__label">Lifetime</span><span>{sub.is_lifetime ? "Yes" : "No"}</span></div>
            <div className="account-row"><span className="account-row__label">Founder</span><span>{sub.is_founder ? "Yes" : "No"}</span></div>
            <div className="account-row"><span className="account-row__label">Period end</span><span>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "–"}</span></div>
            <div className="account-row"><span className="account-row__label">Stripe customer</span><span><code>{stripeCustomer?.stripe_customer_id ?? "–"}</code></span></div>
            <div className="account-row"><span className="account-row__label">Subscription</span><span><code>{sub.stripe_subscription_id ?? "–"}</code></span></div>
          </>
        ) : <p className="body muted">No active subscription.</p>}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 className="sheet__title">Generation runs ({generationRuns?.length ?? 0})</h2>
        <table className="admin-table" style={{ marginTop: 16 }}>
          <thead><tr><th>Time</th><th>Mode</th><th>Tool / pack</th><th>Status</th><th>Latency</th><th>Chars</th></tr></thead>
          <tbody>
            {(generationRuns ?? []).map((run) => (
              <tr key={run.id}>
                <td>{new Date(run.created_at).toLocaleString()}</td>
                <td>{run.mode}</td>
                <td>{run.target_tool ?? run.pack_type ?? "–"}</td>
                <td>{run.status}</td>
                <td>{run.latency_ms != null ? `${run.latency_ms}ms` : "–"}</td>
                <td>{run.input_chars ?? "–"} / {run.output_chars ?? "–"}</td>
              </tr>
            ))}
            {!generationRuns?.length ? <tr><td colSpan={6}>No runs.</td></tr> : null}
          </tbody>
        </table>
        {(generationRuns ?? []).slice(0, 10).map((run) => (
          <details key={`detail-${run.id}`} className="sheet" style={{ marginTop: 12 }}>
            <summary className="small">{new Date(run.created_at).toLocaleString()} · {run.status} · {run.mode}</summary>
            {run.user_idea ? <p className="body" style={{ marginTop: 12 }}><strong>Idea:</strong> {run.user_idea}</p> : null}
            {run.error_message ? <p className="field__error" style={{ marginTop: 8 }}>{run.error_message}</p> : null}
            {run.generated_output ? <pre className="prompt-doc__body" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{run.generated_output}</pre> : null}
          </details>
        ))}
      </section>

      <div className="grid-2" style={{ marginTop: 32 }}>
        <section>
          <h2 className="sheet__title">Saved prompts</h2>
          <div className="library__list" style={{ marginTop: 12 }}>
            {(savedPrompts ?? []).map((prompt) => (
              <Link key={prompt.id} href={`/builder?id=${prompt.id}`} className="library__item">
                <span className="library__item-name">{prompt.title}</span>
                <span className="library__item-kind">{prompt.target_tool} · {prompt.score?.overall ?? "–"}</span>
              </Link>
            ))}
            {!savedPrompts?.length ? <p className="body muted">No saved prompts.</p> : null}
          </div>
        </section>
        <section>
          <h2 className="sheet__title">Packs and feedback</h2>
          <div className="library__list" style={{ marginTop: 12 }}>
            {(promptPacks ?? []).map((pack) => (
              <Link key={pack.id} href={`/builder?pack=${pack.id}`} className="library__item">
                <span className="library__item-name">{pack.title}</span>
                <span className="library__item-kind">{pack.pack_type.replace(/_/g, " ")}</span>
              </Link>
            ))}
            {(feedbackItems ?? []).map((item) => (
              <div key={item.id} className="library__item">
                <span className="library__item-name" style={{ fontSize: 17 }}>{item.message}</span>
                <span className="library__item-kind">{item.page ?? "–"} · {new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {!promptPacks?.length && !feedbackItems?.length ? <p className="body muted">No packs or feedback.</p> : null}
          </div>
        </section>
      </div>
    </>
  );
}
