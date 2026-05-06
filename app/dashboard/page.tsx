import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, TrendingUp, Sparkles, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { PromptCard } from "@/components/dashboard/prompt-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import type { PromptSummary } from "@/types/prompt";

export const dynamic = "force-dynamic"; // always fresh — never cache this page

const TOOLS = ["claude", "cursor", "chatgpt"] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tool?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q = "", tool: toolFilter = "" } = await searchParams;
  const displayName = user.email?.split("@")[0] ?? "there";

  // Load real prompts from DB (RLS enforces user scope automatically)
  const { data: allPrompts, error: promptsError } = await listPrompts();

  const totalPrompts = allPrompts.length;
  const avgScore =
    totalPrompts > 0
      ? Math.round(
          allPrompts.reduce((sum, p) => sum + (p.score?.overall ?? 0), 0) / totalPrompts
        )
      : 0;

  // Filter for display
  const lq = q.toLowerCase().trim();
  let prompts: PromptSummary[] = allPrompts;
  if (lq) {
    prompts = prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(lq) ||
        p.idea.toLowerCase().includes(lq) ||
        p.generated_prompt.toLowerCase().includes(lq)
    );
  }
  if (toolFilter && TOOLS.includes(toolFilter as (typeof TOOLS)[number])) {
    prompts = prompts.filter((p) => p.target_tool === toolFilter);
  }

  return (
    <AppShell>
      <Topbar
        breadcrumb={[{ label: "Workspace" }, { label: "Dashboard" }]}
        actions={
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/builder">
              <Plus className="size-3.5" />
              New Prompt
            </Link>
          </Button>
        }
      />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10">
        {/* Welcome header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            <Sparkles className="size-3.5" />
            Welcome back, {displayName}
          </div>
          <h1 className="font-serif text-3xl md:text-[40px] tracking-tight text-ink-900 leading-[1.05] mb-2">
            What will you ship today?
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed max-w-xl">
            Pick up where you left off, or start a new prompt. Your last 30 days of work lives here.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard label="Prompts created" value={String(totalPrompts)} icon={Sparkles} />
          <StatCard
            label="Average score"
            value={totalPrompts > 0 ? String(avgScore) : "—"}
            icon={TrendingUp}
            accent
          />
          <StatCard label="This week" value={String(thisWeekCount(prompts))} icon={Clock} />
          <StatCard label="Saved" value={String(totalPrompts)} icon={Clock} />
        </div>

        {/* Error banner */}
        {promptsError && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load prompts: {promptsError}. Try refreshing.
          </div>
        )}

        {/* Prompt list */}
        {!promptsError && (
          <>
            {totalPrompts > 0 && (
              <div className="mb-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-0 sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-medium text-ink-900 mb-0.5">
                    Recent prompts
                  </h2>
                  <p className="text-sm text-ink-400">Your work, sorted by last edit</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <FilterChip href="/dashboard" active={!toolFilter}>All</FilterChip>
                  <FilterChip href="/dashboard?tool=claude" active={toolFilter === "claude"}>Claude</FilterChip>
                  <FilterChip href="/dashboard?tool=cursor" active={toolFilter === "cursor"}>Cursor</FilterChip>
                  <FilterChip href="/dashboard?tool=chatgpt" active={toolFilter === "chatgpt"}>ChatGPT</FilterChip>
                </div>
              </div>
            )}

            {totalPrompts === 0 ? (
              <EmptyState />
            ) : prompts.length === 0 ? (
              <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-10 text-center">
                <p className="text-sm text-ink-500">No prompts match your filter.</p>
                <Link href="/dashboard" className="text-sm text-clay-600 hover:underline mt-2 inline-block">
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {prompts.map((prompt: PromptSummary, i: number) => (
                  <PromptCard key={prompt.id} prompt={prompt} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function thisWeekCount(prompts: PromptSummary[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return prompts.filter((p) => new Date(p.created_at).getTime() > weekAgo).length;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-100/70 bg-white p-4 card-soft">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {label}
        </span>
        <Icon className={accent ? "size-3.5 text-clay-500" : "size-3.5 text-ink-300"} />
      </div>
      <div
        className={`font-serif text-3xl font-medium leading-none tabular-nums ${
          accent ? "text-clay-700" : "text-ink-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  children,
  href,
  active,
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors hidden sm:inline-flex ${
        active
          ? "bg-ink-900 text-cream-50"
          : "bg-white border border-ink-200/60 text-ink-600 hover:border-ink-300"
      }`}
    >
      {children}
    </Link>
  );
}
