import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  Wand2,
  Gauge,
  TrendingUp,
  CheckCircle2,
  Zap,
  Crown,
  Layers,
  Hammer,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { FeatureTriad } from "@/components/marketing/feature-triad";
import { ToolStrip } from "@/components/marketing/tool-strip";
import { UseCasesDeep } from "@/components/marketing/use-cases";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PageViewTracker event="landing_view" />

      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/70 border-b border-ink-100/40">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-ink-600">
            <Link href="/demo" className="hover:text-ink-900 transition-colors">Demo</Link>
            <a href="#features" className="hover:text-ink-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-ink-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-ink-900 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/builder">
                Try it free
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[800px] rounded-full bg-clay-200/30 blur-3xl" />
          <div className="absolute top-32 right-0 size-[500px] rounded-full bg-clay-100/40 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-clay-200/60 bg-white/60 backdrop-blur-sm px-3 py-1 text-xs text-ink-600 mb-7">
              <span className="size-1.5 rounded-full bg-clay-500 animate-pulse" />
              Built for developers, automation builders, and AI power users
            </div>

            <h1 className="font-serif text-[44px] md:text-[72px] leading-[1.0] tracking-[-0.03em] font-bold text-ink-900 text-balance">
              From <span className="italic text-clay-600">&ldquo;um…&rdquo;</span>
              <br />
              to the perfect prompt.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-ink-500 leading-relaxed max-w-2xl mx-auto text-pretty">
              Turn a rough idea into an execution-ready prompt — scored across 6 dimensions, auto-optimized, and saved to your workspace.
              Built for Claude, Cursor, and ChatGPT.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/builder">
                  Try Umprompt free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/demo">See it in action</Link>
              </Button>
            </div>

            <p className="mt-5 text-xs text-ink-400 flex items-center justify-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-clay-500" />
                Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-clay-500" />
                7 prompts/week
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-clay-500" />
                Upgrade when ready
              </span>
            </p>
            <p className="mt-3 text-xs text-center text-ink-400">
              Founder offer: first 100 users get Pro for{" "}
              <span className="text-clay-600 font-medium">$4.99/mo</span> or{" "}
              <span className="text-clay-600 font-medium">$34.99 lifetime</span>{" "}
              with code{" "}
              <code className="font-mono text-clay-700 bg-clay-500/10 px-1 py-0.5 rounded text-[11px]">UMPROMPT</code>
            </p>
          </div>

          <div className="mt-14 md:mt-20 relative max-w-4xl mx-auto">
            <div className="absolute inset-x-8 -bottom-6 h-12 rounded-full bg-clay-400/20 blur-2xl pointer-events-none" />
            <Image
              src="/brand/umprompt-banner.png"
              alt="Umprompt — From rough idea to perfect prompt"
              width={1200}
              height={400}
              className="relative rounded-2xl shadow-xl w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>

      {/* Tool strip */}
      <section id="tools" className="border-y border-ink-100/60 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10">
          <ToolStrip />
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 py-14 md:py-20">
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-4xl md:text-5xl font-bold text-ink-900 tabular-nums">
                {s.value}
              </div>
              <div className="text-xs text-ink-400 mt-2 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 pb-16 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {VALUE_PROPS.map((vp) => (
            <div key={vp.headline} className="rounded-2xl border border-ink-100/60 bg-card card-soft p-7">
              <div className="size-9 rounded-xl bg-clay-500/10 border border-clay-200/40 flex items-center justify-center mb-4">
                <vp.icon className="size-5 text-clay-600" strokeWidth={1.75} />
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-900 mb-2">{vp.headline}</h3>
              <p className="text-[14px] text-ink-500 leading-relaxed">{vp.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 lg:px-8 py-20 md:py-28">
        <div className="max-w-2xl mb-12 md:mb-16">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            What it does
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-ink-900 leading-[1.05]">
            A workspace built around how AI tools actually work.
          </h2>
          <p className="mt-5 text-lg text-ink-500 leading-relaxed text-pretty">
            Generic prompt generators give you generic output. Umprompt is tuned per-tool,
            scored on real quality dimensions, and iterates until the prompt performs.
          </p>
        </div>

        <FeatureTriad />
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-5 lg:px-8 pb-20 md:pb-28">
        <div className="rounded-3xl border border-ink-100/70 bg-card card-soft-lg overflow-hidden">
          <div className="p-8 md:p-14">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
              How it works
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-ink-900 mb-10 max-w-xl">
              From idea to a prompt that actually performs.
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-8 rounded-full bg-clay-500 text-white text-sm font-semibold flex items-center justify-center font-mono shrink-0">
                      {i + 1}
                    </div>
                    <step.icon className="size-4 text-ink-400" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-ink-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="max-w-6xl mx-auto px-5 lg:px-8 pb-20 md:pb-28">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            Use cases
          </div>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-ink-900 leading-[1.05]">
            What people build with Umprompt.
          </h2>
        </div>
        <UseCasesDeep />
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 lg:px-8 pb-20 md:pb-28">
        <div className="max-w-2xl mb-12 mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            Pricing
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-ink-900 leading-[1.05]">
            Start free. Upgrade when you&rsquo;re ready.
          </h2>
          <p className="mt-4 text-ink-500 text-[15px]">
            Free plan gives you 7 prompts every week — enough to try the full workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-6 flex flex-col">
            <div className="text-sm font-semibold text-ink-800 mb-1">Free</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-bold text-ink-900">$0</span>
            </div>
            <p className="text-xs text-ink-400 mb-5">Always free</p>
            <ul className="space-y-2.5 flex-1 mb-6">
              {["7 prompts/week", "Full prompt builder", "6-dimension scoring", "Template library"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink-600">
                  <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/builder">Get started free</Link>
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-clay-500/40 bg-clay-500/5 ring-1 ring-clay-500/20 p-6 flex flex-col relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-white bg-clay-500 rounded-full px-3 py-1 whitespace-nowrap">
                Most popular
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold text-ink-800">Pro</div>
              <Zap className="size-4 text-clay-500" />
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-bold text-ink-900">$9.99</span>
              <span className="text-sm text-ink-400">/mo</span>
            </div>
            <p className="text-xs text-clay-600 font-medium mb-5">
              Founder: $4.99/mo with code UMPROMPT
            </p>
            <ul className="space-y-2.5 flex-1 mb-6">
              {[
                "Unlimited fair-use prompts",
                "Prompt Packs",
                "Full history",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink-600">
                  <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full">
              <Link href="/plan">
                Upgrade to Pro
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {/* Lifetime */}
          <div className="rounded-2xl border border-ink-900/20 bg-ink-900/[0.03] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold text-ink-800">Lifetime</div>
              <Crown className="size-4 text-ink-400" />
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-bold text-ink-900">$99.99</span>
            </div>
            <p className="text-xs text-clay-600 font-medium mb-5">
              Founder: $34.99 with code UMPROMPT
            </p>
            <ul className="space-y-2.5 flex-1 mb-6">
              {[
                "Everything in Pro",
                "Pay once, use forever",
                "All future updates",
                "Lifetime access",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink-600">
                  <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/plan">
                Get Lifetime
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <p className="mt-7 text-center text-xs text-ink-400 flex items-center justify-center gap-1.5 flex-wrap">
          <Crown className="size-3 text-clay-500 shrink-0" />
          Founder spots for the first 100 users — apply code{" "}
          <code className="font-mono text-clay-700 bg-clay-500/10 px-1 py-0.5 rounded text-[11px]">UMPROMPT</code>
          {" "}at checkout
        </p>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 pb-24">
        <div className="relative rounded-3xl bg-gradient-to-br from-clay-500 via-clay-600 to-clay-700 p-10 md:p-16 overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
          <Zap className="size-7 text-white/80 mx-auto mb-4" />
          <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight leading-[1.05] max-w-2xl mx-auto">
            Stop wrestling with prompts. Ship work.
          </h2>
          <p className="mt-4 text-clay-50/90 max-w-lg mx-auto">
            Free to start. Built for the people who actually use AI to get things done.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-white text-clay-700 hover:bg-cream-50 shadow-xl"
          >
            <Link href="/builder">
              Open Umprompt
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100/60 bg-cream-50/40">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
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

const STATS = [
  { value: "6", label: "quality dimensions scored" },
  { value: "3", label: "AI tools tuned" },
  { value: "100", label: "founder spots" },
];

const STEPS = [
  {
    icon: Sparkles,
    title: "Describe your goal",
    body: "Type what you want to build, write, or generate in plain language. Add optional context — audience, constraints, output format — to sharpen the result.",
  },
  {
    icon: Wand2,
    title: "Pick your tool",
    body: "Choose Cursor, Claude, or ChatGPT. Umprompt knows what each tool responds to best and structures the prompt accordingly — XML tags for Claude, step-by-step for Cursor, persona-first for ChatGPT.",
  },
  {
    icon: Gauge,
    title: "Generate & score",
    body: "Get a full prompt in seconds, immediately scored across six dimensions: Clarity, Context, Constraints, Examples, Output Format, and Tool Fit. Each dimension includes an actionable tip.",
  },
  {
    icon: TrendingUp,
    title: "Optimize & save",
    body: 'Click "Optimize weak dimensions" to automatically rewrite the prompt targeting every low-scoring area. Then save it to your workspace — reopen and iterate anytime.',
  },
];

const VALUE_PROPS = [
  {
    icon: Shuffle,
    headline: "Not another prompt library.",
    body: "Libraries give you prompts someone else wrote. Umprompt generates prompts from your specific idea — structured around how your target tool actually works.",
  },
  {
    icon: Hammer,
    headline: "Built for people who actually use AI tools.",
    body: "Not for sharing on Twitter. For shipping work. If you use Claude, Cursor, or ChatGPT to build real things, Umprompt is the missing step between your idea and execution.",
  },
  {
    icon: Layers,
    headline: "Generate, score, optimize, and save.",
    body: "One idea. Four steps. A quality-scored, optimized prompt saved to your workspace — ready to paste, iterate on, and reuse.",
  },
];
