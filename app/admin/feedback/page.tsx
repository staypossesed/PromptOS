import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const admin = await requireAdminUser();
  const db = createAdminClient();

  void insertAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "admin_view_feedback",
  });

  const { data: feedbackRows } = await db
    .from("feedback")
    .select("id, user_id, email, message, page, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // Fetch emails from profiles for user_id-based feedback
  const userIds = [
    ...new Set(
      (feedbackRows ?? []).map((f) => f.user_id).filter(Boolean) as string[]
    ),
  ];
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const p of profiles ?? []) emailMap[p.id] = p.email;
  }

  return (
    <main className="px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink-900">Feedback</h1>
        <p className="text-sm text-ink-400 mt-1">
          {feedbackRows?.length ?? 0} submissions (latest 200)
        </p>
      </div>

      {feedbackRows && feedbackRows.length > 0 ? (
        <div className="space-y-3">
          {feedbackRows.map((f) => {
            const resolvedEmail =
              f.email ?? (f.user_id ? emailMap[f.user_id] : null) ?? "anonymous";
            return (
              <div
                key={f.id}
                className="rounded-xl border border-ink-100/70 bg-cream-50 p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-ink-600">{resolvedEmail}</span>
                    {f.page && (
                      <span className="text-[10px] font-medium bg-ink-100/60 text-ink-500 rounded px-1.5 py-0.5">
                        {f.page}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-300 shrink-0">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-ink-700 leading-relaxed">{f.message}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-ink-100/70 bg-cream-50 p-10 text-center">
          <p className="text-sm text-ink-400">No feedback submissions yet.</p>
        </div>
      )}
    </main>
  );
}
