import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";
import { ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; status?: string }>;
}) {
  const admin = await requireAdminUser();
  const { mode: modeFilter = "", status: statusFilter = "" } = await searchParams;
  const db = createAdminClient();

  void insertAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "admin_view_generations_list",
    metadata: { mode: modeFilter, status: statusFilter },
  });

  // Build query
  let query = db
    .from("generation_runs")
    .select(
      "id, user_id, request_id, mode, target_tool, pack_type, status, user_idea, generated_output, generated_json, score, error_message, latency_ms, input_chars, output_chars, saved_prompt_id, saved_pack_id, output_language, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (modeFilter) query = query.eq("mode", modeFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: runs } = await query;

  // Fetch email for each unique user
  const userIds = [...new Set((runs ?? []).map((r) => r.user_id).filter(Boolean) as string[])];
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const p of profiles ?? []) emailMap[p.id] = p.email;
  }

  return (
    <main className="px-6 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink-900">Generation runs</h1>
        <p className="text-sm text-ink-400 mt-1">{runs?.length ?? 0} runs shown (latest 200)</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-6">
        <select
          name="mode"
          defaultValue={modeFilter}
          className="rounded-lg border border-ink-200/60 bg-white px-3 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-clay-400/40"
        >
          <option value="">All modes</option>
          <option value="single">Single</option>
          <option value="pack">Pack</option>
          <option value="optimize">Optimize</option>
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-ink-200/60 bg-white px-3 py-1.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-clay-400/40"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="started">Started</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-clay-500 text-white px-4 py-1.5 text-sm font-medium hover:bg-clay-600 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-ink-100/70 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100/70 bg-cream-50">
              {["Time", "User", "Mode", "Tool / Pack", "Status", "Latency", "In", "Out", "Saved", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400 whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((run, i) => (
              <tr
                key={run.id}
                className={`border-b border-ink-100/40 text-xs ${i % 2 === 0 ? "" : "bg-cream-50/30"}`}
              >
                <td className="px-3 py-2.5 text-ink-400 whitespace-nowrap">
                  {new Date(run.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-ink-600 font-mono max-w-[140px] truncate">
                  {run.user_id ? (emailMap[run.user_id] ?? run.user_id.slice(0, 8) + "…") : "—"}
                </td>
                <td className="px-3 py-2.5 text-ink-600 capitalize">{run.mode}</td>
                <td className="px-3 py-2.5 text-ink-400">
                  {run.target_tool ?? run.pack_type ?? "—"}
                </td>
                <td className="px-3 py-2.5">
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
                </td>
                <td className="px-3 py-2.5 text-ink-400 tabular-nums whitespace-nowrap">
                  {run.latency_ms != null ? `${run.latency_ms}ms` : "—"}
                </td>
                <td className="px-3 py-2.5 text-ink-400 tabular-nums">{run.input_chars ?? "—"}</td>
                <td className="px-3 py-2.5 text-ink-400 tabular-nums">{run.output_chars ?? "—"}</td>
                <td className="px-3 py-2.5 text-ink-400">
                  {run.saved_prompt_id || run.saved_pack_id ? (
                    <span className="text-sage-600">Yes</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {/* Inline detail via details/summary */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail expansions — rendered below the table as collapsible cards */}
      {(runs ?? []).some((r) => r.user_idea || r.generated_output || r.error_message) && (
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold text-ink-700">Run details</h2>
          {(runs ?? []).map((run) => {
            if (!run.user_idea && !run.generated_output && !run.error_message) return null;
            return (
              <details
                key={`detail-${run.id}`}
                className="rounded-xl border border-ink-100/70 overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-3 cursor-pointer select-none bg-cream-50 hover:bg-cream-100/60 transition-colors text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
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
                    <span className="text-ink-400 text-xs">
                      {run.user_id ? (emailMap[run.user_id] ?? run.user_id.slice(0, 8)) : "anon"}
                    </span>
                    <span className="text-ink-400 text-xs truncate max-w-[200px]">
                      {run.user_idea?.slice(0, 50)}{(run.user_idea?.length ?? 0) > 50 ? "…" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-ink-300">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                    <ChevronDown className="size-3 text-ink-300" />
                  </div>
                </summary>

                <div className="px-5 py-4 border-t border-ink-100/60 space-y-4">
                  {run.user_idea && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1.5">
                        User request
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-ink-700 font-sans leading-relaxed bg-cream-50 rounded p-3">
                        {run.user_idea}
                      </pre>
                    </div>
                  )}
                  {run.generated_output && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1.5">
                        Generated output
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-ink-700 font-sans leading-relaxed bg-cream-50 rounded p-3 max-h-72 overflow-y-auto">
                        {run.generated_output}
                      </pre>
                    </div>
                  )}
                  {run.error_message && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-destructive/70 mb-1.5">
                        Error
                      </div>
                      <pre className="text-xs text-destructive bg-destructive/5 rounded p-3">
                        {run.error_message}
                      </pre>
                    </div>
                  )}
                  {run.score && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1.5">
                        Score
                      </div>
                      <pre className="text-xs font-mono text-ink-600 bg-cream-50 rounded p-3 overflow-x-auto">
                        {JSON.stringify(run.score, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-[11px] text-ink-400">
                    {run.input_chars != null && <span>Input: {run.input_chars} chars</span>}
                    {run.output_chars != null && <span>Output: {run.output_chars} chars</span>}
                    {run.latency_ms != null && <span>Latency: {run.latency_ms}ms</span>}
                    {run.output_language && <span>Language: {run.output_language}</span>}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
