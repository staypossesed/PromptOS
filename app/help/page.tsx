import Link from "next/link";
import { redirect } from "next/navigation";
import { HelpCircle, Wand2, TrendingUp, Save, RefreshCw, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "What is Umprompt?",
    a: "Umprompt turns rough ideas into execution-ready AI prompts. Describe what you want to build, pick your target tool (Claude, Cursor, or ChatGPT), and Umprompt generates a structured, scored prompt ready to paste.",
  },
  {
    q: "How does the scoring work?",
    a: "Every generated prompt is scored across 6 dimensions: Clarity, Context, Constraints, Examples, Output Format, and Tool Fit. Each dimension gets a score out of 100, and the weighted average becomes your overall score.",
  },
  {
    q: "What's the difference between Claude, Cursor, and ChatGPT modes?",
    a: "Each tool has its own prompt style. Claude mode emphasizes reasoning and structured thinking. Cursor mode produces code-centric prompts with file and workspace context. ChatGPT mode keeps prompts concise and instruction-heavy.",
  },
  {
    q: "Can I edit a saved prompt?",
    a: "Yes. Click any prompt on the Dashboard or History page to open it in the Builder. Make changes and click 'Update' to save the new version.",
  },
  {
    q: "What does 'Regenerate' do?",
    a: "Regenerate runs the generation again with the same idea and tool — useful if the first result wasn't quite right. The old prompt is replaced and a new score is computed.",
  },
  {
    q: "How many prompts can I create?",
    a: "Free plan includes 20 prompts per month. Your usage resets at the start of each calendar month.",
  },
];

const STEPS = [
  {
    icon: Wand2,
    title: "1. Describe your idea",
    body: "Type your idea in the input — be specific about the goal. The more detail you give, the stronger the generated prompt.",
  },
  {
    icon: Zap,
    title: "2. Pick your tool",
    body: "Choose Claude, Cursor, or ChatGPT. Umprompt tailors the structure and tone to match how each tool works best.",
  },
  {
    icon: TrendingUp,
    title: "3. Generate & score",
    body: "Hit Generate. Umprompt writes the prompt and immediately scores it across 6 dimensions. Review the tips to understand any weak spots.",
  },
  {
    icon: Save,
    title: "4. Save & reuse",
    body: "Click Save draft to store the prompt. Access it any time from the Dashboard or History page, then open it in the Builder to refine.",
  },
  {
    icon: RefreshCw,
    title: "5. Iterate",
    body: "Not happy? Adjust your idea or context and regenerate. Each iteration is instant — the score updates automatically.",
  },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <Topbar breadcrumb={[{ label: "Workspace" }, { label: "Help & Docs" }]} />

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-10 max-w-3xl">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            <HelpCircle className="size-3.5" />
            Documentation
          </div>
          <h1 className="font-serif text-3xl md:text-[36px] tracking-tight text-ink-900 leading-tight mb-1">
            Help & Docs
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed">
            Everything you need to get the most out of Umprompt.
          </p>
        </div>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-medium text-ink-900 mb-5">How it works</h2>
          <div className="space-y-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-ink-100/70 bg-card card-soft p-4"
              >
                <div className="size-9 rounded-xl bg-clay-500/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-clay-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-800 mb-0.5">{title}</div>
                  <p className="text-sm text-ink-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="font-serif text-2xl font-medium text-ink-900 mb-5">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {FAQS.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none text-sm font-medium text-ink-800 hover:text-ink-900 transition-colors">
                  {q}
                  <span className="text-ink-300 group-open:rotate-45 transition-transform inline-block text-lg leading-none">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-ink-500 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-clay-200/60 bg-clay-50/60 p-6 text-center">
          <p className="text-sm text-ink-600 mb-3">
            Ready to build your first prompt?
          </p>
          <Button asChild>
            <Link href="/builder">
              <Wand2 className="size-4" />
              Open the Builder
            </Link>
          </Button>
        </div>

        {/* Feedback CTA */}
        <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-600">
            Something missing from these docs? Have a suggestion?
          </p>
          <FeedbackButton page="/help" label="Send feedback" />
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 pt-4 pb-2">
          <Link href="/privacy" className="text-xs text-ink-400 hover:text-ink-600 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-xs text-ink-200">·</span>
          <Link href="/terms" className="text-xs text-ink-400 hover:text-ink-600 transition-colors">
            Terms of Service
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
