import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { TemplateGrid } from "@/components/templates/template-grid";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <PageViewTracker event="templates_opened" />
      <Topbar
        breadcrumb={[{ label: "Library" }, { label: "Templates" }]}
      />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            <Sparkles className="size-3.5" />
            Starter templates
          </div>
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-2">
            Templates
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed max-w-xl">
            Start from a proven starting point. Click any template to open it in the builder — edit, refine, and generate in seconds.
          </p>
        </div>

        <TemplateGrid />
      </main>
    </AppShell>
  );
}
