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
import { getServerTranslations } from "@/lib/i18n/server";
import type { PromptSummary } from "@/types/prompt";

export const dynamic = "force-dynamic";

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

  const { data: allPrompts, error: promptsError } = await listPrompts();
  const { t } = await getServerTranslations();

  const totalPrompts = allPrompts.length;
  const avgScore =
    totalPrompts > 0
      ? Math.round(
          allPrompts.reduce((sum, p) => sum + (p.score?.overall ?? 0), 0) / totalPrompts
        )
      : 0;
  const bestScore =
    totalPrompts > 0
      ? Math.max(...allPrompts.map((p) => p.score?.overall ?? 0))
      : 0;

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
        breadcrumb={[{ label: t("nav.workspace") }, { label: t("nav.dashboard") }]}
        actions={
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/builder">
              <Plus className="size-3.5" />
              {t("nav.newPrompt")}
            </Link>
          </Button>
        }
      />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10">
        {/* Welcome header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            <Sparkles className="size-3.5" />
            {t("dashboard.eyebrow", { name: displayName })}
          </div>
          <h1 className="font-serif text-3xl md:text-[40px] font-semibold tracking-tight text-ink-900 leading-[1.05] mb-2">
            {t("dashboard.title")}
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed max-w-xl">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard label={t("dashboard.promptsSaved")} value={String(totalPrompts)} icon={Sparkles} />
          <StatCard
            label={t("dashboard.averageScore")}
            value={totalPrompts > 0 ? String(avgScore) : "—"}
            icon={TrendingUp}
            accent
          />
          <StatCard label={t("dashboard.thisWeek")} value={String(thisWeekCount(allPrompts))} icon={Clock} />
          <StatCard
            label={t("dashboard.bestScore")}
            value={totalPrompts > 0 ? String(bestScore) : "—"}
            icon={TrendingUp}
          />
        </div>

        {/* Error banner */}
        {promptsError && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t("dashboard.loadError", { error: promptsError })} {t("common.tryRefreshing")}
          </div>
        )}

        {/* Prompt list */}
        {!promptsError && (
          <>
            {totalPrompts > 0 && (
              <div className="mb-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-0 sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-medium text-ink-900 mb-0.5">
                    {t("dashboard.recentPrompts")}
                  </h2>
                  <p className="text-sm text-ink-400">{t("dashboard.recentSubtitle")}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <FilterChip href="/dashboard" active={!toolFilter}>{t("common.all")}</FilterChip>
                  <FilterChip href="/dashboard?tool=claude" active={toolFilter === "claude"}>Claude</FilterChip>
                  <FilterChip href="/dashboard?tool=cursor" active={toolFilter === "cursor"}>Cursor</FilterChip>
                  <FilterChip href="/dashboard?tool=chatgpt" active={toolFilter === "chatgpt"}>ChatGPT</FilterChip>
                </div>
              </div>
            )}

            {totalPrompts === 0 ? (
              <EmptyState />
            ) : prompts.length === 0 ? (
              <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-10 text-center">
                <p className="text-sm text-ink-500">{t("dashboard.noPromptsMatch")}</p>
                <Link href="/dashboard" className="text-sm text-clay-600 hover:underline mt-2 inline-block">
                  {t("common.clearFilters")}
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

function thisWeekCount(prompts: PromptSummary[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return prompts.filter((p) => new Date(p.created_at).getTime() > weekAgo).length;
}

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-clay-500/5 border-clay-200/50" : "border-ink-100/70 bg-card card-soft"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">{label}</span>
        <Icon className={accent ? "size-3.5 text-clay-500" : "size-3.5 text-ink-300"} />
      </div>
      <div className={`font-serif text-[32px] font-medium leading-none tabular-nums ${accent ? "text-clay-700" : "text-ink-900"}`}>
        {value}
      </div>
    </div>
  );
}

function FilterChip({ children, href, active }: { children: React.ReactNode; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors hidden sm:inline-flex ${
        active ? "bg-ink-900 text-cream-50" : "bg-white border border-ink-200/60 text-ink-600 hover:border-ink-300"
      }`}
    >
      {children}
    </Link>
  );
}
