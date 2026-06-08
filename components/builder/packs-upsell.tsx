"use client";

import Link from "next/link";
import { Crown, Lock, ArrowRight, Code2, Rocket, Mail, Bot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PACK_TYPES, type PackType } from "@/types/prompt-pack";

const PACK_ICONS: Record<PackType, React.ComponentType<{ className?: string }>> = {
  build_an_app: Code2,
  launch_a_saas: Rocket,
  sales_outreach_campaign: Mail,
  automation_workflow: Bot,
  research_report: Search,
};

const SAMPLE_PROMPTS = [
  {
    title: "Plan the architecture",
    body: "You are a senior software architect. Given the following idea, design a scalable system architecture with component breakdown, data flow, and technology choices that suit the project scope.",
  },
  {
    title: "Scaffold the project",
    body: "You are an expert Next.js developer. Set up the initial project structure following the architecture spec, including folder layout, core dependencies, and base configuration files.",
  },
  {
    title: "Build core features",
    body: "You are building the main feature set. Implement the primary user-facing functionality following the architecture plan with TypeScript strict mode and existing conventions.",
  },
  {
    title: "Write tests",
    body: "You are a QA engineer. Write comprehensive tests for the core features including unit tests, integration tests, and edge case coverage using the project's existing test setup.",
  },
  {
    title: "Document the API",
    body: "You are a technical writer. Create clear, developer-friendly API documentation covering all endpoints, request and response shapes, authentication, and code examples.",
  },
];

export function PacksUpsell() {
  return (
    <div className="space-y-5 max-w-4xl">
      {/* Value prop */}
      <div className="rounded-2xl border border-clay-200/50 bg-gradient-to-br from-clay-50/70 to-cream-50 p-8 md:p-10">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-clay-500/10 border border-clay-200/50 px-3 py-1 text-xs font-semibold text-clay-700 mb-5">
            <Crown className="size-3" />
            Pro feature
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink-900 mb-3 leading-tight">
            One idea. Five coordinated prompts.
          </h2>
          <p className="text-ink-500 text-[15px] leading-relaxed mb-7">
            Describe your project once — Prompt Packs generate a full workflow of 5 prompts that build on each other,
            each one structured for the AI tool you&rsquo;re using.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/plan?promo=UMPROMPT">
                Claim founder deal — $4.99/mo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Or{" "}
            <span className="text-clay-600 font-medium">$34.99 lifetime</span>{" "}
            — first 100 users only
          </p>
        </div>
      </div>

      {/* Pack types grid */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-3">
          5 pack types included
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {PACK_TYPES.map((pt) => {
            const Icon = PACK_ICONS[pt.id];
            return (
              <div
                key={pt.id}
                className="rounded-xl border border-ink-100/70 bg-card card-soft p-4 flex items-start gap-3"
              >
                <div className="size-8 rounded-lg bg-clay-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="size-4 text-clay-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-800">{pt.label}</div>
                  <div className="text-[11px] text-ink-400 mt-0.5 leading-relaxed">{pt.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blurred sample output */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-3">
          Sample output — Build an App
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-ink-100/70">
          {/* Blurred content */}
          <div className="blur-[3px] pointer-events-none select-none p-5 space-y-3 bg-card">
            {SAMPLE_PROMPTS.map((p, i) => (
              <div key={p.title} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-5 rounded-full bg-clay-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-ink-800">{p.title}</span>
                </div>
                <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-2">{p.body}</p>
              </div>
            ))}
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/85 flex items-end pb-8 justify-center">
            <div className="rounded-2xl bg-white border border-clay-200/60 shadow-lg px-6 py-5 text-center">
              <div className="size-9 rounded-xl bg-clay-500/10 flex items-center justify-center mx-auto mb-2.5">
                <Lock className="size-4 text-clay-600" />
              </div>
              <div className="text-sm font-semibold text-ink-900 mb-0.5">Unlock Prompt Packs</div>
              <div className="text-xs text-ink-500 mb-3">
                Upgrade to Pro to generate full pack workflows
              </div>
              <Button asChild size="sm">
                <Link href="/plan?promo=UMPROMPT">
                  See founder pricing
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
