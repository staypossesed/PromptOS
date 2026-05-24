import Link from "next/link";
import { ArrowRight, ArrowDown, Sparkles, TrendingUp, Save, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "Demo — Umprompt",
  description:
    "See how Umprompt turns a rough idea into a scored, optimized, execution-ready prompt in four steps.",
};

const BEFORE_DIMS = [
  { label: "Clarity", score: 88 },
  { label: "Context", score: 82 },
  { label: "Constraints", score: 76 },
  { label: "Examples", score: 58 },
  { label: "Output Format", score: 84 },
  { label: "Tool Fit", score: 79 },
];

const AFTER_DIMS = [
  { label: "Clarity", score: 94 },
  { label: "Context", score: 91 },
  { label: "Constraints", score: 88 },
  { label: "Examples", score: 90 },
  { label: "Output Format", score: 95 },
  { label: "Tool Fit", score: 92 },
];

export default function DemoPage() {
  const beforeOverall = Math.round(
    BEFORE_DIMS.reduce((s, d) => s + d.score, 0) / BEFORE_DIMS.length
  );
  const afterOverall = Math.round(
    AFTER_DIMS.reduce((s, d) => s + d.score, 0) / AFTER_DIMS.length
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/70 border-b border-ink-100/40">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Button asChild size="sm">
            <Link href="/builder">
              Try it free
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 lg:px-8 py-14 md:py-20">
        {/* Intro */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-clay-200/60 bg-white/60 px-3 py-1 text-xs text-ink-600 mb-6">
            <Sparkles className="size-3.5 text-clay-500" />
            Interactive walkthrough
          </div>
          <h1 className="font-serif text-[38px] md:text-[54px] leading-[1.04] tracking-[-0.02em] text-ink-900 mb-4">
            From rough idea to a prompt<br className="hidden md:block" /> that actually performs.
          </h1>
          <p className="text-lg text-ink-500 max-w-xl mx-auto leading-relaxed">
            One idea. Four steps. A scored, optimized prompt — saved and ready to paste into Cursor.
          </p>
        </div>

        {/* Step 1 — Rough idea */}
        <Step number={1} icon={Sparkles} label="The rough idea">
          <div className="rounded-xl border border-ink-100/70 bg-cream-50/60 p-5 md:p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400 mb-3">
              What the user typed
            </div>
            <p className="font-mono text-[15px] md:text-[17px] text-ink-800 leading-relaxed bg-white border border-ink-100 rounded-lg p-4">
              &ldquo;Add a usage stats dashboard to my SaaS — show daily active users, monthly revenue, and churn rate with charts&rdquo;
            </p>
            <p className="mt-3 text-[13px] text-ink-400">
              Rough, vague, no structure. Pasted directly into Cursor, this produces inconsistent results.
            </p>
          </div>
        </Step>

        <Divider />

        {/* Step 2 — Generated prompt */}
        <Step number={2} icon={Zap} label="Generated for Cursor">
          <div className="rounded-xl border border-ink-100/70 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100/60 bg-cream-50/40 text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">
              Umprompt output · Cursor mode
            </div>
            <div className="p-5 md:p-7 font-mono text-[12.5px] leading-[1.7] text-ink-800 space-y-3">
              <div>
                <span className="text-ink-400">Working in:</span>{" "}
                <span className="text-clay-700">app/(dashboard)/analytics/</span>
              </div>
              <div>
                <span className="block font-semibold text-ink-900 mb-1">Task:</span>
                Build a usage stats dashboard with three metric cards (DAU, MRR, churn rate) and an interactive line chart showing 30-day trends.
              </div>
              <div>
                <span className="block font-semibold text-ink-900 mb-1">Stack:</span>
                <div className="pl-3 border-l-2 border-ink-100 space-y-0.5 text-ink-600">
                  <div>- Next.js 15 App Router + TypeScript strict</div>
                  <div>- Tailwind CSS</div>
                  <div>- Recharts (already installed)</div>
                </div>
              </div>
              <div>
                <span className="block font-semibold text-ink-900 mb-1">Component breakdown:</span>
                <div className="pl-3 border-l-2 border-ink-100 space-y-0.5 text-ink-600">
                  <div>1. <span className="text-clay-700">app/(dashboard)/analytics/page.tsx</span> — Server Component, fetches via getAnalytics()</div>
                  <div>2. <span className="text-clay-700">components/dashboard/MetricCard.tsx</span> — accepts &#123; label, value, delta &#125;</div>
                  <div>3. <span className="text-clay-700">components/charts/TrendChart.tsx</span> — &quot;use client&quot;, wraps Recharts LineChart</div>
                </div>
              </div>
              <div>
                <span className="block font-semibold text-ink-900 mb-1">Constraints:</span>
                <div className="pl-3 border-l-2 border-ink-100 space-y-0.5 text-ink-600">
                  <div>- Fetch all data server-side; pass as props to client charts</div>
                  <div>- Do not add new npm packages</div>
                  <div>- Charts must have accessible aria-label attributes</div>
                </div>
              </div>
              <div>
                <span className="block font-semibold text-ink-900 mb-1">Acceptance criteria:</span>
                <span className="text-ink-600">DAU, MRR, and churn visible on first load. Chart renders 30-day data. Metric cards show ▲/▼ delta styling.</span>
              </div>
            </div>
          </div>
        </Step>

        <Divider />

        {/* Step 3 — Initial score */}
        <Step number={3} icon={Zap} label={`Initial quality score — ${beforeOverall}/100`}>
          <div className="rounded-xl border border-ink-100/70 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100/60 bg-cream-50/40 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                Prompt score
              </span>
              <span className="font-serif text-3xl font-medium text-ink-900">
                {beforeOverall}
                <span className="text-sm text-ink-400 font-sans">/100</span>
              </span>
            </div>
            <div className="p-5 md:p-7 space-y-3">
              {BEFORE_DIMS.map((d) => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-1.5 text-[13px]">
                    <span className="text-ink-700">{d.label}</span>
                    <span
                      className={`font-mono font-medium ${
                        d.score < 65 ? "text-amber-600" : "text-ink-500"
                      }`}
                    >
                      {d.score}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-cream-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        d.score < 65 ? "bg-amber-400" : "bg-clay-500"
                      }`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                  {d.score < 65 && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      Weak · Add a concrete before/after example to ground the output format.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Step>

        <Divider />

        {/* Step 4 — After optimization */}
        <Step number={4} icon={TrendingUp} label={`After optimization — ${afterOverall}/100`}>
          <div className="rounded-xl border border-clay-200/50 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-clay-200/50 bg-clay-50/60 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-clay-600">
                Optimized score
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-ink-400 line-through font-mono">{beforeOverall}</span>
                <ArrowRight className="size-3 text-clay-500" />
                <span className="font-serif text-3xl font-medium text-ink-900">
                  {afterOverall}
                  <span className="text-sm text-ink-400 font-sans">/100</span>
                </span>
              </div>
            </div>
            <div className="p-5 md:p-7 space-y-3">
              {AFTER_DIMS.map((d, i) => {
                const prev = BEFORE_DIMS[i].score;
                const improved = d.score > prev;
                return (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5 text-[13px]">
                      <span className="text-ink-700">{d.label}</span>
                      <div className="flex items-center gap-2 font-mono">
                        {improved && (
                          <span className="text-ink-300 text-[11px] line-through">{prev}</span>
                        )}
                        <span className={improved ? "text-clay-600 font-medium" : "text-ink-500"}>
                          {d.score}
                        </span>
                        {improved && (
                          <span className="text-[10px] text-clay-600">▲</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-cream-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-clay-500"
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Step>

        <Divider />

        {/* Step 5 — Saved */}
        <Step number={5} icon={Save} label="Saved to history">
          <div className="rounded-xl border border-ink-100/70 bg-white p-5 md:p-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-ink-900">
                    SaaS usage stats dashboard
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-clay-50 text-clay-700 border border-clay-200/60 rounded-full px-2 py-0.5">
                    Cursor
                  </span>
                </div>
                <p className="text-[13px] text-ink-400">
                  Score: {afterOverall}/100 · Saved just now · Reopen in Builder to iterate
                </p>
              </div>
              <CheckCircle2 className="size-6 text-clay-500 shrink-0" />
            </div>
          </div>
          <p className="mt-3 text-[13px] text-ink-400 text-center">
            Reopen from History any time to refine, re-score, or re-optimize.
          </p>
        </Step>

        {/* CTA */}
        <div className="mt-14 rounded-3xl bg-gradient-to-br from-clay-500 via-clay-600 to-clay-700 p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
          <h2 className="font-serif text-3xl md:text-4xl text-white tracking-tight leading-tight mb-3">
            Try it with your own idea.
          </h2>
          <p className="text-clay-50/90 mb-7 max-w-sm mx-auto">
            Free to start. 7 prompts/week. Built for Claude, Cursor, and ChatGPT.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-clay-700 hover:bg-cream-50 shadow-xl"
          >
            <Link href="/builder">
              Open the builder
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100/60 bg-cream-50/40">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-5 text-xs text-ink-400">
            <Link href="/privacy" className="hover:text-ink-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-700 transition-colors">Terms</Link>
            <Link href="/help" className="hover:text-ink-700 transition-colors">Help</Link>
            <span>© {new Date().getFullYear()} Umprompt</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  label,
  children,
}: {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-clay-500 text-white text-sm font-semibold flex items-center justify-center font-mono shrink-0">
          {number}
        </div>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-ink-400" />
          <span className="font-serif text-xl font-medium text-ink-900">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex justify-center py-6">
      <ArrowDown className="size-5 text-ink-200" />
    </div>
  );
}
