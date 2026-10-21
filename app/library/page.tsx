import { redirect } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { LibraryManager } from "@/components/library/library-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { new: initialNew } = await searchParams;

  return (
    <AppShell>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / Library</p>
          <h1 className="app-head__title">The library.</h1>
          <p className="app-head__sub">
            Profiles hold the facts you repeat. Playbooks hold reusable tasks. Nothing is
            applied until you confirm it in the builder.
          </p>
        </div>
      </header>
      <LibraryManager initialNew={initialNew} />
    </AppShell>
  );
}
