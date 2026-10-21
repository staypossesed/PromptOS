import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { ButtonLink } from "@/components/system/button";
import { createClient } from "@/lib/supabase/server";
import { listPrompts } from "@/lib/prompts";
import type { PromptSummary } from "@/types/prompt";

export const dynamic = "force-dynamic";

const TOOLS = ["claude", "cursor", "chatgpt"] as const;

function thisWeekCount(prompts: PromptSummary[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return prompts.filter((prompt) => new Date(prompt.created_at).getTime() > weekAgo).length;
}

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

  const totalPrompts = allPrompts.length;
  const avgScore = totalPrompts
    ? Math.round(allPrompts.reduce((sum, prompt) => sum + (prompt.score?.overall ?? 0), 0) / totalPrompts)
    : 0;
  const bestScore = totalPrompts ? Math.max(...allPrompts.map((prompt) => prompt.score?.overall ?? 0)) : 0;

  const lq = q.toLowerCase().trim();
  let prompts: PromptSummary[] = allPrompts;
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

  return (
    <AppShell>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / Dashboard</p>
          <h1 className="app-head__title">Good to see you, {displayName}.</h1>
          <p className="app-head__sub">
            Every prompt you save becomes a document here. Open one to read, edit, copy, or
            start the next task.
          </p>
        </div>
        <ButtonLink href="/builder" variant="accent">New prompt</ButtonLink>
      </header>

      <section className="admin-stats" aria-label="Your numbers">
        <div>
          <div className="admin-stat__value">{totalPrompts}</div>
          <div className="admin-stat__label">prompts saved</div>
        </div>
        <div>
          <div className="admin-stat__value">{totalPrompts ? avgScore : "–"}</div>
          <div className="admin-stat__label">average score</div>
        </div>
        <div>
          <div className="admin-stat__value">{thisWeekCount(allPrompts)}</div>
          <div className="admin-stat__label">this week</div>
        </div>
        <div>
          <div className="admin-stat__value">{totalPrompts ? bestScore : "–"}</div>
          <div className="admin-stat__label">best score</div>
        </div>
      </section>

      {promptsError ? (
        <div className="sheet" style={{ marginTop: 32 }}>
          <p className="body">Could not load your prompts: {promptsError}</p>
        </div>
      ) : null}

      {!promptsError && totalPrompts === 0 ? (
        <section className="sheet" style={{ marginTop: 32 }}>
          <h2 className="sheet__title">Nothing saved yet.</h2>
          <p className="body" style={{ marginTop: 14 }}>
            Start with a rough idea. The first seven prompts this week are free.
          </p>
          <div className="composer__actions" style={{ marginTop: 20 }}>
            <ButtonLink href="/builder" variant="accent">Start with an idea</ButtonLink>
            <Link href="/templates" className="link-arrow">Browse templates</Link>
          </div>
        </section>
      ) : null}

      {!promptsError && totalPrompts > 0 ? (
        <section style={{ marginTop: 40 }}>
          <div className="app-head" style={{ paddingBottom: 16 }}>
            <h2 className="app-head__title" style={{ fontSize: 34 }}>Recent prompts</h2>
            <div className="tabs">
              <Link href="/dashboard" aria-current={!toolFilter ? "page" : undefined}>All</Link>
              {TOOLS.map((tool) => (
                <Link key={tool} href={`/dashboard?tool=${tool}`} aria-current={toolFilter === tool ? "page" : undefined}>
                  {tool === "chatgpt" ? "ChatGPT" : tool[0].toUpperCase() + tool.slice(1)}
                </Link>
              ))}
            </div>
          </div>

          {prompts.length === 0 ? (
            <div className="sheet">
              <p className="body">No prompts match that filter.</p>
              <Link href="/dashboard" className="link-arrow" style={{ marginTop: 14, display: "inline-flex" }}>Clear the filter</Link>
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Tool</th>
                  <th>Score</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((prompt) => (
                  <tr key={prompt.id}>
                    <td>
                      <Link href={`/builder?id=${prompt.id}`} className="ledger__title">
                        {prompt.title || prompt.idea.slice(0, 60)}
                      </Link>
                      <p className="small muted" style={{ marginTop: 4 }}>{prompt.idea.slice(0, 90)}</p>
                    </td>
                    <td>{prompt.target_tool === "chatgpt" ? "ChatGPT" : prompt.target_tool}</td>
                    <td className="ledger__num">{prompt.score?.overall ?? "–"}</td>
                    <td>{new Date(prompt.updated_at ?? prompt.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
