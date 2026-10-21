import { requireAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const admin = await requireAdminUser();
  const db = createAdminClient();

  void insertAuditLog({ adminUserId: admin.id, adminEmail: admin.email, action: "admin_view_feedback" });

  const { data: feedbackRows } = await db
    .from("feedback")
    .select("id, user_id, email, message, page, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const userIds = [...new Set((feedbackRows ?? []).map((item) => item.user_id).filter(Boolean) as string[])];
  const emailMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", userIds);
    for (const profile of profiles ?? []) emailMap[profile.id] = profile.email;
  }

  return (
    <>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Admin / Feedback</p>
          <h1 className="app-head__title">Feedback.</h1>
          <p className="app-head__sub">{feedbackRows?.length ?? 0} submissions (latest 200).</p>
        </div>
      </header>

      <div className="stack--loose stack">
        {(feedbackRows ?? []).map((item) => {
          const email = item.email ?? (item.user_id ? emailMap[item.user_id] : null) ?? "anonymous";
          return (
            <article key={item.id} className="sheet">
              <div className="sheet__head">
                <span className="sheet__meta">{email}{item.page ? ` · ${item.page}` : ""}</span>
                <span className="sheet__meta">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <p className="body">{item.message}</p>
            </article>
          );
        })}
        {!feedbackRows?.length ? <p className="body muted">No feedback submissions yet.</p> : null}
      </div>
    </>
  );
}
