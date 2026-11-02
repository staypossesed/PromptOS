import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, History as HistoryIcon, Layers } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { PromptCard } from "@/components/dashboard/prompt-card";
import { PromptFilters } from "@/components/dashboard/prompt-filters";
import { PromptPackCard } from "@/components/dashboard/prompt-pack-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import { listPromptPacks } from "@/lib/prompt-packs";
import { getServerTranslations } from "@/lib/i18n/server";
import type { PromptSummary } from "@/types/prompt";
import type { PromptPackSummary } from "@/types/prompt-pack";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { deliveryFilter, filterSavedPrompts } from "@/lib/prompt-history";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; delivery?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q = "", delivery, tab = "prompts" } = await searchParams;
  const selectedDelivery = deliveryFilter(delivery);
  const activeTab = tab === "packs" ? "packs" : "prompts";
  const { t } = await getServerTranslations();

  let prompts: PromptSummary[] = [];
  let promptsError: string | null = null;

  if (activeTab === "prompts") {
    const result = await listPrompts(200);
    promptsError = result.error;
    prompts = filterSavedPrompts(result.data, q, selectedDelivery);
  }

  let packs: PromptPackSummary[] = [];
  let packsError: string | null = null;

  if (activeTab === "packs") {
    const result = await listPromptPacks(200);
    packsError = result.error;
    packs = result.data;
  }

  return (
    <AppShell>
      <PageViewTracker event="history_opened" />
      <Topbar
        breadcrumb={[{ label: t("nav.workspace") }, { label: t("nav.history") }]}
        actions={
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/builder?fresh=1">
              <Plus className="size-3.5" />
              {t("nav.newPrompt")}
            </Link>
          </Button>
        }
      />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            <HistoryIcon className="size-3.5" />
            {t("history.eyebrow")}
          </div>
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-1">
            {t("history.title")}
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed">
            {t("history.subtitle")}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex p-1 bg-cream-100 rounded-full border border-ink-100/60 w-fit">
          <TabButton href="/history?tab=prompts" active={activeTab === "prompts"}>
            {t("history.promptsTab")}
          </TabButton>
          <TabButton href="/history?tab=packs" active={activeTab === "packs"}>
            <Layers className="size-3.5" />
            {t("history.packsTab")}
          </TabButton>
        </div>

        {/* ── Prompts tab ─────────────────────────────────────────────────── */}
        {activeTab === "prompts" && (
          <>
            {promptsError && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("history.loadPromptsError", { error: promptsError })} {t("common.tryRefreshing")}
              </div>
            )}

            {!promptsError && (
              <>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                  {q && (
                    <p className="text-sm text-ink-500">
                      {t("history.showingResults", { n: prompts.length })}{" "}
                      <span className="font-medium text-ink-800">&ldquo;{q}&rdquo;</span>
                      {" — "}
                      <Link href="/history" className="text-clay-600 hover:underline">
                        {t("history.clear")}
                      </Link>
                    </p>
                  )}

                  <PromptFilters path="/history" query={q} delivery={selectedDelivery} />
                </div>

                {prompts.length === 0 && !q && !selectedDelivery ? (
                  <EmptyState />
                ) : prompts.length === 0 ? (
                  <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-10 text-center">
                    <p className="text-sm text-ink-500">{t("history.noPromptsMatch")}</p>
                    <Link href="/history" className="text-sm text-clay-600 hover:underline mt-2 inline-block">
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
          </>
        )}

        {/* ── Packs tab ───────────────────────────────────────────────────── */}
        {activeTab === "packs" && (
          <>
            {packsError && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("history.loadPacksError", { error: packsError })} {t("common.tryRefreshing")}
              </div>
            )}

            {!packsError && (
              <>
                {packs.length === 0 ? (
                  <div className="relative rounded-3xl border border-ink-100/70 bg-card card-soft overflow-hidden">
                    <div className="absolute inset-0 bg-dotgrid opacity-40 pointer-events-none" />
                    <div className="relative p-10 md:p-14 text-center max-w-lg mx-auto">
                      <div className="size-12 rounded-2xl bg-clay-500/10 mx-auto mb-5 flex items-center justify-center">
                        <Layers className="size-5 text-clay-600" />
                      </div>
                      <h3 className="font-serif text-2xl font-medium text-ink-900 mb-2">
                        {t("history.noPacksTitle")}
                      </h3>
                      <p className="text-sm text-ink-500 leading-relaxed mb-7 text-pretty max-w-sm mx-auto">
                        {t("history.noPacksSubtitle")}
                      </p>
                      <Button asChild size="lg">
                        <Link href="/builder?fresh=1">
                          <Plus className="size-4" />
                          {t("history.createFirstPack")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {packs.map((pack: PromptPackSummary, i: number) => (
                      <PromptPackCard key={pack.id} pack={pack} index={i} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}

function TabButton({ children, href, active }: { children: React.ReactNode; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all ${
        active ? "bg-white text-ink-900 card-soft" : "text-ink-500 hover:text-ink-700"
      }`}
    >
      {children}
    </Link>
  );
}
