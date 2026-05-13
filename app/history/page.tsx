import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, History as HistoryIcon, Layers } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { PromptCard } from "@/components/dashboard/prompt-card";
import { PromptPackCard } from "@/components/dashboard/prompt-pack-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import { listPromptPacks } from "@/lib/prompt-packs";
import type { PromptSummary } from "@/types/prompt";
import type { PromptPackSummary } from "@/types/prompt-pack";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export const dynamic = "force-dynamic";

const TOOLS = ["claude", "cursor", "chatgpt"] as const;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tool?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q = "", tool: toolFilter = "", tab = "prompts" } = await searchParams;
  const activeTab = tab === "packs" ? "packs" : "prompts";

  const toolLabel: Record<string, string> = { claude: "Claude", cursor: "Cursor", chatgpt: "ChatGPT" };

  // ── Prompts tab ──────────────────────────────────────────────────────────
  let prompts: PromptSummary[] = [];
  let promptsError: string | null = null;

  if (activeTab === "prompts") {
    const result = await listPrompts(200);
    promptsError = result.error;
    prompts = result.data;

    const lq = q.toLowerCase().trim();
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
  }

  // ── Packs tab ────────────────────────────────────────────────────────────
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
        breadcrumb={[{ label: "Workspace" }, { label: "History" }]}
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
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            <HistoryIcon className="size-3.5" />
            All prompts
          </div>
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-1">
            Prompt history
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed">
            Every prompt you&apos;ve built, sorted by last edit.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex p-1 bg-cream-100 rounded-full border border-ink-100/60 w-fit">
          <TabButton
            href="/history?tab=prompts"
            active={activeTab === "prompts"}
          >
            Prompts
          </TabButton>
          <TabButton
            href="/history?tab=packs"
            active={activeTab === "packs"}
          >
            <Layers className="size-3.5" />
            Packs
          </TabButton>
        </div>

        {/* ── Prompts tab ─────────────────────────────────────────────────── */}
        {activeTab === "prompts" && (
          <>
            {promptsError && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Failed to load prompts: {promptsError}. Try refreshing.
              </div>
            )}

            {!promptsError && (
              <>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                  {q && (
                    <p className="text-sm text-ink-500">
                      Showing{" "}
                      <span className="font-medium text-ink-800">{prompts.length}</span> results for{" "}
                      <span className="font-medium text-ink-800">&ldquo;{q}&rdquo;</span>
                      {" — "}
                      <Link href="/history" className="text-clay-600 hover:underline">
                        Clear
                      </Link>
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 sm:ml-auto">
                    <FilterChip
                      href={q ? `/history?q=${encodeURIComponent(q)}` : "/history"}
                      active={!toolFilter}
                    >
                      All
                    </FilterChip>
                    {TOOLS.map((t) => (
                      <FilterChip
                        key={t}
                        href={
                          q
                            ? `/history?q=${encodeURIComponent(q)}&tool=${t}`
                            : `/history?tool=${t}`
                        }
                        active={toolFilter === t}
                      >
                        {toolLabel[t]}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                {prompts.length === 0 && !q && !toolFilter ? (
                  <EmptyState />
                ) : prompts.length === 0 ? (
                  <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-10 text-center">
                    <p className="text-sm text-ink-500">No prompts match your filter.</p>
                    <Link href="/history" className="text-sm text-clay-600 hover:underline mt-2 inline-block">
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
          </>
        )}

        {/* ── Packs tab ───────────────────────────────────────────────────── */}
        {activeTab === "packs" && (
          <>
            {packsError && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Failed to load packs: {packsError}. Try refreshing.
              </div>
            )}

            {!packsError && (
              <>
                {packs.length === 0 ? (
                  <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-10 text-center">
                    <Layers className="size-8 text-ink-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-ink-700 mb-1">No packs saved yet</p>
                    <p className="text-sm text-ink-400 mb-4">
                      Generate a Prompt Pack in the builder and save it to see it here.
                    </p>
                    <Button asChild size="sm">
                      <Link href="/builder">
                        <Plus className="size-3.5" />
                        New Pack
                      </Link>
                    </Button>
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

function TabButton({
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
      className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all ${
        active ? "bg-white text-ink-900 card-soft" : "text-ink-500 hover:text-ink-700"
      }`}
    >
      {children}
    </Link>
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
      className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
        active
          ? "bg-ink-900 text-cream-50"
          : "bg-white border border-ink-200/60 text-ink-600 hover:border-ink-300"
      }`}
    >
      {children}
    </Link>
  );
}
