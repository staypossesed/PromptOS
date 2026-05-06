import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, History as HistoryIcon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { PromptCard } from "@/components/dashboard/prompt-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import type { PromptSummary } from "@/types/prompt";

export const dynamic = "force-dynamic";

const TOOLS = ["claude", "cursor", "chatgpt"] as const;

export default async function HistoryPage({
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

  const { data: allPrompts, error } = await listPrompts(200);

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

  const toolLabel: Record<string, string> = { claude: "Claude", cursor: "Cursor", chatgpt: "ChatGPT" };

  return (
    <AppShell>
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

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load prompts: {error}. Try refreshing.
          </div>
        )}

        {!error && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Search indicator */}
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

              {/* Tool filter chips */}
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
                    href={q ? `/history?q=${encodeURIComponent(q)}&tool=${t}` : `/history?tool=${t}`}
                    active={toolFilter === t}
                  >
                    {toolLabel[t]}
                  </FilterChip>
                ))}
              </div>
            </div>

            {allPrompts.length === 0 ? (
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
      </main>
    </AppShell>
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
