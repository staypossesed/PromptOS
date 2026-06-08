import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { planDisplayName } from "@/lib/billing";
import type { PlanType } from "@/lib/billing";
import { ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

// ── Small collapsible card ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-100/70 bg-cream-50 overflow-hidden">
      <details open>
        <summary className="flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b border-ink-100/60 bg-cream-50 hover:bg-cream-100/60 transition-colors">
          <span className="text-sm font-semibold text-ink-700">{title}</span>
          <ChevronDown className="size-3.5 text-ink-400" />
        </summary>
        <div className="px-5 py-4">{children}</div>
      </details>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5 border-b border-ink-100/40 last:border-0">
      <span className="w-36 shrink-0 text-[11px] font-medium text-ink-400 uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="text-sm text-ink-700 break-all">{value}</span>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin = await requireAdminUser();
  const { userId } = await params;

  const db = createAdminClient();

  // Fetch auth user
  const { data: authUserData, error: authErr } = await db.auth.admin.getUserById(userId);
  if (authErr || !authUserData?.user) notFound();
  const authUser = authUserData.user;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all user data in parallel
  const [
    { data: sub },
    { data: stripeCustomer },
    { data: generationRuns },
    { data: savedPrompts },
    { data: promptPacks },
    { data: feedbackItems },
    { count: weekUsage },
  ] = await Promise.all([
    db
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("billing_customers")
      .select("stripe_customer_id, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("generation_runs")
      .select("id, mode, target_tool, pack_type, status, user_idea, generated_output, score, error_message, latency_ms, input_chars, output_chars, saved_prompt_id, saved_pack_id, output_language, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("prompts")
      .select("id, title, idea, target_tool, score, generated_prompt, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("prompt_packs")
      .select("id, title, idea, pack_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("feedback")
      .select("id, message, page, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo),
  ]);

  void insertAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "admin_view_user",
    targetUserId: userId,
  });

  const plan: PlanType = (sub?.plan as PlanType) ?? "free";
  const isFounder = sub?.is_founder ?? false;
  const planLabel = planDisplayName(plan, isFounder);
  const provider = (authUser.app_metadata?.provider as string) ?? "email";

  return (
    <main className="px-6 py-8 max-w-4xl space-y-5">
      <div className="mb-2">
        <Link href="/admin/users" className="text-xs text-ink-400 hover:text-ink-600 transition-colors">
          Users
        </Link>
        <span className="text-xs text-ink-300 mx-1.5">/</span>
        <span className="text-xs text-ink-600">{authUser.email}</span>
      </div>

      <h1 className="font-serif text-2xl font-semibold text-ink-900">{authUser.email}</h1>

      {/* Profile */}
      <Section title="Profile">
        <Row label="User ID" value={<code className="font-mono text-xs">{authUser.id}</code>} />
        <Row label="Email" value={authUser.email} />
        <Row label="Provider" value={<span className="capitalize">{provider}</span>} />
        <Row label="Joined" value={new Date(authUser.created_at).toLocaleString()} />
        <Row
          label="Last sign-in"
          value={authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : "—"}
        />
        <Row label="Plan" value={planLabel} />
        <Row label="Used this week" value={weekUsage ?? 0} />
        <Row label="Saved prompts" value={savedPrompts?.length ?? 0} />
        <Row label="Prompt packs" value={promptPacks?.length ?? 0} />
      </Section>

      {/* Billing */}
      <Section title="Billing">
        {sub ? (
          <>
            <Row label="Plan" value={planLabel} />
            <Row label="Status" value={sub.status} />
            <Row label="Lifetime" value={sub.is_lifetime ? "Yes" : "No"} />
            <Row label="Founder" value={sub.is_founder ? "Yes" : "No"} />
            <Row
              label="Period end"
              value={sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
            />
            {stripeCustomer?.stripe_customer_id && (
              <Row
                label="Stripe customer"
                value={<code className="font-mono text-xs">{stripeCustomer.stripe_customer_id}</code>}
              />
            )}
            {sub.stripe_subscription_id && (
              <Row
                label="Subscription ID"
                value={<code className="font-mono text-xs">{sub.stripe_subscription_id}</code>}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-ink-400">No active subscription.</p>
        )}
      </Section>

      {/* Generation runs */}
      <Section title={`Generation runs (${generationRuns?.length ?? 0})`}>
        {generationRuns && generationRuns.length > 0 ? (
          <div className="space-y-3">
            {generationRuns.map((run) => (
              <details
                key={run.id}
                className="rounded-lg border border-ink-100/60 bg-white overflow-hidden"
              >
                <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none text-sm hover:bg-cream-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        run.status === "success"
                          ? "bg-sage-500/10 text-sage-700"
                          : run.status === "failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-ink-100/60 text-ink-500"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-ink-600 capitalize">{run.mode}</span>
                    {run.target_tool && (
                      <span className="text-ink-400 text-xs">{run.target_tool}</span>
                    )}
                    {run.pack_type && (
                      <span className="text-ink-400 text-xs">{run.pack_type}</span>
                    )}
                    <span className="text-ink-400 text-xs truncate max-w-[200px]">
                      {run.user_idea?.slice(0, 60)}
                      {(run.user_idea?.length ?? 0) > 60 ? "…" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {run.latency_ms != null && (
                      <span className="text-[11px] text-ink-400">{run.latency_ms}ms</span>
                    )}
                    <span className="text-[11px] text-ink-300">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                    <ChevronDown className="size-3 text-ink-300" />
                  </div>
                </summary>
                <div className="px-4 py-3 border-t border-ink-100/60 space-y-3">
                  {run.user_idea && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
                        User idea
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-ink-700 font-sans leading-relaxed bg-cream-50 rounded p-3">
                        {run.user_idea}
                      </pre>
                    </div>
                  )}
                  {run.generated_output && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
                        Generated output
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-ink-700 font-sans leading-relaxed bg-cream-50 rounded p-3 max-h-64 overflow-y-auto">
                        {run.generated_output}
                      </pre>
                    </div>
                  )}
                  {run.error_message && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-destructive/70 mb-1">
                        Error
                      </div>
                      <pre className="text-xs text-destructive bg-destructive/5 rounded p-3">
                        {run.error_message}
                      </pre>
                    </div>
                  )}
                  {run.score && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
                        Score
                      </div>
                      <pre className="text-xs text-ink-600 font-mono bg-cream-50 rounded p-3 overflow-x-auto">
                        {JSON.stringify(run.score, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-[11px] text-ink-400">
                    {run.input_chars != null && <span>Input: {run.input_chars} chars</span>}
                    {run.output_chars != null && <span>Output: {run.output_chars} chars</span>}
                    {run.output_language && <span>Lang: {run.output_language}</span>}
                    {run.saved_prompt_id && <span className="text-sage-600">Saved</span>}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">No generation runs found.</p>
        )}
      </Section>

      {/* Saved prompts */}
      <Section title={`Saved prompts (${savedPrompts?.length ?? 0})`}>
        {savedPrompts && savedPrompts.length > 0 ? (
          <div className="space-y-2">
            {savedPrompts.map((p) => (
              <details
                key={p.id}
                className="rounded-lg border border-ink-100/60 bg-white overflow-hidden"
              >
                <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none text-sm hover:bg-cream-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-ink-700 truncate max-w-[240px]">{p.title}</span>
                    <span className="text-xs text-ink-400 capitalize">{p.target_tool}</span>
                    {(p.score as { overall?: number } | null)?.overall != null && (
                      <span className="text-xs text-clay-600">
                        {(p.score as { overall: number }).overall}/100
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-300 shrink-0 ml-4">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </summary>
                <div className="px-4 py-3 border-t border-ink-100/60">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
                    Idea
                  </div>
                  <p className="text-xs text-ink-600 mb-3">{p.idea}</p>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
                    Prompt preview
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-ink-700 font-sans leading-relaxed bg-cream-50 rounded p-3 max-h-48 overflow-y-auto">
                    {p.generated_prompt}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">No saved prompts.</p>
        )}
      </Section>

      {/* Prompt packs */}
      {promptPacks && promptPacks.length > 0 && (
        <Section title={`Prompt packs (${promptPacks.length})`}>
          <div className="space-y-1.5">
            {promptPacks.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-ink-100/60 bg-white text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-ink-700 truncate">{pack.title}</span>
                  <span className="text-xs text-ink-400">{pack.pack_type}</span>
                </div>
                <span className="text-[11px] text-ink-300 shrink-0">
                  {new Date(pack.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Feedback */}
      {feedbackItems && feedbackItems.length > 0 && (
        <Section title={`Feedback (${feedbackItems.length})`}>
          <div className="space-y-2">
            {feedbackItems.map((f) => (
              <div key={f.id} className="rounded-lg border border-ink-100/60 bg-white px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-ink-400">{f.page ?? "—"}</span>
                  <span className="text-[11px] text-ink-300">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-ink-700">{f.message}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
