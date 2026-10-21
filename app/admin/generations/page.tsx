import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";

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

  let query = db
    .from("generation_runs")
    .select("id, user_id, request_id, mode, target_tool, pack_type, status, user_idea, generated_output, generated_json, score, error_message, latency_ms, input_chars, output_chars, saved_prompt_id, saved_pack_id, output_language, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (modeFilter) query = query.eq("mode", modeFilter);
  if (statusFilter) query = query.eq("status", statusFilter);
  const { data: runs } = await query;

  const userIds = [...new Set((runs ?? []).map((run) => run.user_id).filter(Boolean) as string[])];
  const emailMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", userIds);
    for (const profile of profiles ?? []) emailMap[profile.id] = profile.email;
  }

  return (
    <>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Admin / Generations</p>
          <h1 className="app-head__title">Generation runs.</h1>
          <p className="app-head__sub">{runs?.length ?? 0} runs shown (latest 200).</p>
        </div>
      </header>

      <form method="get" className="composer__actions" style={{ marginBottom: 24 }}>
        <select name="mode" defaultValue={modeFilter} className="field__select" style={{ maxWidth: 180 }}>
          <option value="">All modes</option>
          <option value="single">Single</option>
          <option value="pack">Pack</option>
          <option value="optimize">Optimize</option>
        </select>
        <select name="status" defaultValue={statusFilter} className="field__select" style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="started">Started</option>
        </select>
        <button type="submit" className="button button--small">Filter</button>
      </form>

      <table className="admin-table">
        <thead><tr><th>Time</th><th>User</th><th>Mode</th><th>Tool / pack</th><th>Status</th><th>Latency</th><th>Chars</th><th>Saved</th></tr></thead>
        <tbody>
          {(runs ?? []).map((run) => (
            <tr key={run.id}>
              <td>{new Date(run.created_at).toLocaleString()}</td>
              <td>{run.user_id ? emailMap[run.user_id] ?? run.user_id.slice(0, 8) + "…" : "–"}</td>
              <td>{run.mode}</td>
              <td>{run.target_tool ?? run.pack_type ?? "–"}</td>
              <td>{run.status}</td>
              <td>{run.latency_ms != null ? `${run.latency_ms}ms` : "–"}</td>
              <td>{run.input_chars ?? "–"} / {run.output_chars ?? "–"}</td>
              <td>{run.saved_prompt_id || run.saved_pack_id ? "Yes" : "–"}</td>
            </tr>
          ))}
          {!runs?.length ? <tr><td colSpan={8}>No runs.</td></tr> : null}
        </tbody>
      </table>

      <div className="stack--loose stack" style={{ marginTop: 32 }}>
        {(runs ?? []).map((run) =>
          run.user_idea || run.generated_output || run.error_message ? (
            <details key={`detail-${run.id}`} className="sheet">
              <summary className="small">{new Date(run.created_at).toLocaleString()} · {run.status} · {run.mode} · {run.target_tool ?? run.pack_type ?? ""}</summary>
              {run.user_idea ? <p className="body" style={{ marginTop: 12 }}><strong>Idea:</strong> {run.user_idea}</p> : null}
              {run.error_message ? <p className="field__error" style={{ marginTop: 8 }}>{run.error_message}</p> : null}
              {run.generated_output ? <pre className="prompt-doc__body" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{run.generated_output}</pre> : null}
            </details>
          ) : null
        )}
      </div>
    </>
  );
}
