"use client";

import Link from "next/link";
import { ArrowRight, Wand2, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_ACTIONS = [
  {
    icon: Wand2,
    label: "Write a prompt",
    sub: "Describe any idea, get a structured prompt",
    href: "/builder",
    accent: true,
  },
  {
    icon: Layers,
    label: "Build a prompt pack",
    sub: "5 coordinated prompts for a full project",
    href: "/builder?mode=pack",
    accent: false,
  },
  {
    icon: Sparkles,
    label: "Browse templates",
    sub: "Start from a proven starting point",
    href: "/templates",
    accent: false,
  },
];

export function EmptyState() {
  return (
    <div className="relative rounded-3xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-30 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-clay-200/25 blur-3xl pointer-events-none" />

      <div className="relative px-8 pt-12 pb-10 md:px-14 md:pt-16 md:pb-12">
        <div className="max-w-lg mx-auto text-center mb-10">
          <h3 className="font-serif text-2xl md:text-3xl font-medium text-ink-900 mb-3">
            No saved prompts yet.
          </h3>
          <p className="text-[14.5px] text-ink-500 leading-relaxed text-pretty">
            Turn one rough idea into a prompt worth keeping. Umprompt structures it, scores it across six dimensions, and saves it to your workspace.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group rounded-2xl border p-4 flex flex-col gap-2.5 transition-all ${
                action.accent
                  ? "bg-clay-500 border-clay-600/30 hover:bg-clay-600 text-white"
                  : "bg-white border-ink-100/70 hover:border-clay-300/50 hover:shadow-sm"
              }`}
            >
              <action.icon className={`size-4 ${action.accent ? "text-white/80" : "text-clay-500"}`} />
              <div>
                <div className={`text-sm font-semibold ${action.accent ? "text-white" : "text-ink-800"}`}>
                  {action.label}
                </div>
                <div className={`text-[12px] leading-snug mt-0.5 ${action.accent ? "text-white/70" : "text-ink-400"}`}>
                  {action.sub}
                </div>
              </div>
              <ArrowRight className={`size-3.5 mt-auto self-end transition-transform group-hover:translate-x-0.5 ${action.accent ? "text-white/60" : "text-ink-300"}`} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
