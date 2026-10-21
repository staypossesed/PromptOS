import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { ButtonLink } from "@/components/system/button";
import { PageViewTracker } from "@/components/system/page-view-tracker";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { category = "" } = await searchParams;
  const categories = Array.from(new Set(TEMPLATES.map((template) => template.category)));
  const visible = category ? TEMPLATES.filter((template) => template.category === category) : TEMPLATES;

  return (
    <AppShell>
      <PageViewTracker event="templates_opened" />
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / Templates</p>
          <h1 className="app-head__title">Starting points.</h1>
          <p className="app-head__sub">
            A template is a real task with the context already filled in. Open one and make it
            yours.
          </p>
        </div>
        <ButtonLink href="/builder" variant="accent">Start from scratch</ButtonLink>
      </header>

      <div className="tabs" style={{ marginBottom: 28 }}>
        <Link href="/templates" aria-current={!category ? "page" : undefined}>All</Link>
        {categories.map((item) => (
          <Link key={item} href={`/templates?category=${encodeURIComponent(item)}`} aria-current={category === item ? "page" : undefined}>
            {item}
          </Link>
        ))}
      </div>

      <div className="stack--loose stack">
        {visible.map((template) => (
          <article key={template.id} className="sheet" data-ui>
            <div className="sheet__head">
              <div>
                <span className="sheet__meta">{template.category}</span>
                <h2 className="sheet__title" style={{ marginTop: 8 }}>{template.title}</h2>
              </div>
              <Link href={`/builder?template=${template.id}`} className="link-arrow">Use this</Link>
            </div>
            <p className="body">{template.description}</p>
            <p className="small muted" style={{ marginTop: 12 }}>{template.idea}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
