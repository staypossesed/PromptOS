import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Wand2,
  Gauge,
  Download,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { LandingHeroDemo } from "@/components/marketing/hero-demo";
import { FeatureTriad } from "@/components/marketing/feature-triad";
import { ToolStrip } from "@/components/marketing/tool-strip";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/70 border-b border-ink-100/40">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-ink-600">
            <a href="#features" className="hover:text-ink-900 transition-colors">Features</a>
            <a href="#tools" className="hover:text-ink-900 transition-colors">Supported tools</a>
            <a href="#how" className="hover:text-ink-900 transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/dashboard">Sign in</Link>
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
        {/* Soft warm glow */}
        <div className="absolute inset-x-0 top-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[800px] rounded-full bg-clay-200/30 blur-3xl" />
          <div className="absolute top-32 right-0 size-[500px] rounded-full bg-clay-100/40 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-clay-200/60 bg-white/60 backdrop-blur-sm px-3 py-1 text-xs text-ink-600 mb-7">
              <span className="size-1.5 rounded-full bg-clay-500 animate-pulse" />
              Built for vibe coders, automation freelancers, and creators
            </div>

            {/* Headline */}
            <h1 className="font-serif text-[44px] md:text-[68px] leading-[1.02] tracking-[-0.02em] text-ink-900 text-balance">
              Describe what you want.
              <br />
              <span className="italic text-clay-600">Get the perfect prompt.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-ink-500 leading-relaxed max-w-2xl mx-auto text-pretty">
              PromptOS turns rough ideas into execution-ready prompts for the exact AI tool you use — scored across six dimensions, exported in one click.
            </p>

            {/* CTA */}
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/builder">
                  Start building
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/dashboard">View example dashboard</Link>
              </Button>
            </div>

            <p className="mt-5 text-xs text-ink-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-clay-500" />
              Free to start · No credit card · Works with Cursor, Claude, ChatGPT
            </p>
          </div>

          {/* Hero demo card */}
          <div className="mt-14 md:mt-20">
            <LandingHeroDemo />
          </div>
        </div>
      </section>

      {/* Tool strip */}
      <section id="tools" className="border-y border-ink-100/60 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10">
          <ToolStrip />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 lg:px-8 py-20 md:py-28">
        <div className="max-w-2xl mb-12 md:mb-16">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            What it does
          </div>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-ink-900 leading-[1.05]">
            A workspace built around <span className="italic">how</span> AI tools actually work.
          </h2>
          <p className="mt-5 text-lg text-ink-500 leading-relaxed text-pretty">
            Generic prompt generators give you generic output. PromptOS is tuned per-tool, scored on real quality dimensions, and exports the way each tool expects.
          </p>
        </div>

        <FeatureTriad />
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-5 lg:px-8 pb-20 md:pb-28">
        <div className="rounded-3xl border border-ink-100/70 bg-white card-soft-lg overflow-hidden">
          <div className="p-8 md:p-14">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
              How it works
            </div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight text-ink-900 mb-10 max-w-xl">
              From idea to a prompt that actually performs.
            </h2>

            <div className="grid md:grid-cols-3 gap-8 md:gap-10">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-8 rounded-full bg-clay-500 text-white text-sm font-semibold flex items-center justify-center font-mono">
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
              Open PromptOS
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100/60 bg-cream-50/40">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="text-xs text-ink-400">
            © {new Date().getFullYear()} PromptOS. Crafted for prompt engineers.
          </div>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    icon: Sparkles,
    title: "Describe your goal",
    body: "Type what you want to build, write, or generate — in plain language. Optionally add context, constraints, and examples.",
  },
  {
    icon: Wand2,
    title: "Pick your tool",
    body: "PromptOS knows what Cursor, Claude, and ChatGPT each respond to best — and structures the prompt accordingly.",
  },
  {
    icon: Gauge,
    title: "Score and ship",
    body: "Get a 0–100 score across clarity, context, constraints, examples, format, and tool fit. Copy or export and go.",
  },
];
