import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { ButtonLink } from "@/components/system/button";
import { PageViewTracker } from "@/components/system/page-view-tracker";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import { listPromptPacks } from "@/lib/prompt-packs";
import type { PromptSummary } from "@/types/prompt";
import type { PromptPackSummary } from "@/types/prompt-pack";

export const dynamic = "force-dynamic";

const TOOLS = ["claude", "cursor", "chatgpt"] as const;
const TOOL_LABEL: Record<string, string> = { claude: "Claude", cursor: "Cursor", chatgpt: "ChatGPT" };

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

  let prompts: PromptSummary[] = [];
  let promptsError: string | null = null;
  if (activeTab === "prompts") {
    const result = await listPrompts(200);
    promptsError = result.error;
    prompts = result.data;
    const lq = q.toLowerCase().trim();
    if (lq) {
      prompts = prompts.filter((prompt) =>
        prompt.title.toLowerCase().includes(lq) ||
        prompt.idea.toLowerCase().includes(lq) ||
        prompt.generated_prompt.toLowerCase().includes(lq)
      );
    }
    if (toolFilter && TOOLS.includes(toolFilter as (typeof TOOLS)[number])) {
      prompts = prompts.filter((prompt) => prompt.target_tool === toolFilter);
    }
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
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / History</p>
          <h1 className="app-head__title">The record.</h1>
          <p className="app-head__sub">
            Every saved prompt and pack, in the order you made it. Open one to read it again.
          </p>
        </div>
        <ButtonLink href="/builder" variant="accent">New prompt</ButtonLink>
      </header>

      <div className="tabs" style={{ marginBottom: 28 }}>
        <Link href="/history?tab=prompts" aria-current={activeTab === "prompts" ? "page" : undefined}>Prompts</Link>
        <Link href="/history?tab=packs" aria-current={activeTab === "packs" ? "page" : undefined}>Prompt packs</Link>
      </div>

      {activeTab === "prompts" ? (
        <>
          <form className="composer__actions" style={{ marginBottom: 24 }} action="/history" method="get">
            <input type="hidden" name="tab" value="prompts" />
            <label className="sr-only" htmlFor="history-q">Search prompts</label>
            <input id="history-q" name="q" defaultValue={q} className="field__input" style={{ maxWidth: 360 }} placeholder="Search your prompts" />
            <button type="submit" className="button button--small">Search</button>
            {q ? <Link href="/history" className="link-arrow">Clear</Link> : null}
          </form>

          <div className="tabs" style={{ marginBottom: 20 }}>
            <Link href={q ? `/history?q=${encodeURIComponent(q)}` : "/history"} aria-current={!toolFilter ? "page" : undefined}>All</Link>
            {TOOLS.map((tool) => (
              <Link key={tool} href={q ? `/history?q=${encodeURIComponent(q)}&tool=${tool}` : `/history?tool=${tool}`} aria-current={toolFilter === tool ? "page" : undefined}>
                {TOOL_LABEL[tool]}
              </Link>
            ))}
          </div>

          {promptsError ? <p className="field__error">Could not load your prompts: {promptsError}</p> : null}
          {!promptsError && prompts.length === 0 ? (
            <section className="sheet">
              <h2 className="sheet__title">No prompts here.</h2>
              <p className="body" style={{ marginTop: 12 }}>
                {q || toolFilter ? "Nothing matches that filter." : "Your saved prompts will appear here."}
              </p>
            </section>
          ) : null}
          {!promptsError && prompts.length > 0 ? (
            <table className="ledger">
              <thead>
                <tr><th>Prompt</th><th>Tool</th><th>Score</th><th>Saved</th></tr>
              </thead>
              <tbody>
                {prompts.map((prompt) => (
                  <tr key={prompt.id}>
                    <td>
                      <Link href={`/builder?id=${prompt.id}`} className="ledger__title">{prompt.title || prompt.idea.slice(0, 60)}</Link>
                      <p className="small muted" style={{ marginTop: 4 }}>{prompt.idea.slice(0, 100)}</p>
                    </td>
                    <td>{TOOL_LABEL[prompt.target_tool] ?? prompt.target_tool}</td>
                    <td className="ledger__num">{prompt.score?.overall ?? "–"}</td>
                    <td>{new Date(prompt.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      ) : (
        <>
          {packsError ? <p className="field__error">Could not load your packs: {packsError}</p> : null}
          {!packsError && packs.length === 0 ? (
            <section className="sheet">
              <h2 className="sheet__title">No packs yet.</h2>
              <p className="body" style={{ marginTop: 12 }}>
                A prompt pack breaks a multi-step task into prompts that run in order.
              </p>
              <div className="composer__actions" style={{ marginTop: 20 }}>
                <ButtonLink href="/builder?mode=pack" variant="accent">Make a pack</ButtonLink>
              </div>
            </section>
          ) : null}
          {!packsError && packs.length > 0 ? (
            <table className="ledger">
              <thead>
                <tr><th>Pack</th><th>Kind</th><th>Prompts</th><th>Saved</th></tr>
              </thead>
              <tbody>
                {packs.map((pack) => (
                  <tr key={pack.id}>
                    <td>
                      <Link href={`/builder?pack=${pack.id}`} className="ledger__title">{pack.title}</Link>
                      <p className="small muted" style={{ marginTop: 4 }}>{pack.idea.slice(0, 100)}</p>
                    </td>
                    <td>{pack.pack_type.replace(/_/g, " ")}</td>
                    <td className="ledger__num">{pack.prompts.length}</td>
                    <td>{new Date(pack.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
