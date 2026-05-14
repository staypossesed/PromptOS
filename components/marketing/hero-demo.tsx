"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function LandingHeroDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative max-w-5xl mx-auto"
    >
      {/* Soft drop shadow plate */}
      <div className="absolute inset-x-8 -bottom-6 h-12 rounded-full bg-clay-300/30 blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-ink-100/70 bg-card card-soft-lg overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100/60 bg-cream-50/60">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-ink-200" />
            <span className="size-2.5 rounded-full bg-ink-200" />
            <span className="size-2.5 rounded-full bg-ink-200" />
          </div>
          <div className="ml-3 h-5 px-2.5 rounded-full bg-white border border-ink-100 flex items-center text-[10px] text-ink-400 font-mono">
            umprompt.app/builder
          </div>
        </div>

        {/* Body — three columns mock */}
        <div className="grid grid-cols-12 gap-0">
          {/* Left: idea + tool */}
          <div className="col-span-12 md:col-span-4 p-5 md:border-r border-ink-100/60 bg-cream-50/40 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2">
                <Sparkles className="size-3 text-clay-500" />
                Idea
              </div>
              <div className="rounded-lg bg-white border border-ink-100 p-3 text-[12px] text-ink-700 leading-relaxed">
                Build a Next.js auth flow with Supabase magic links and protected routes
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Target tool
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {["Claude", "Cursor", "GPT"].map((t, i) => (
                  <div
                    key={t}
                    className={`text-[10px] font-medium rounded-md py-1.5 px-1 text-center border ${
                      i === 0
                        ? "border-clay-400/70 bg-white text-ink-900"
                        : "border-ink-100 bg-white/50 text-ink-400"
                    }`}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="rounded-lg bg-clay-500 text-white text-[11px] font-medium py-2 px-3 flex items-center justify-center gap-1.5"
            >
              Generate prompt
              <ArrowRight className="size-3" />
            </motion.div>
          </div>

          {/* Center: generated prompt */}
          <div className="col-span-12 md:col-span-5 p-5 border-t md:border-t-0 md:border-r border-ink-100/60">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2.5">
              Generated for Claude
            </div>
            <div className="space-y-2 font-mono text-[10.5px] leading-[1.65] text-ink-800">
              <TypedLine delay={0.4}>
                <span className="text-clay-600">{"<role>"}</span>
              </TypedLine>
              <TypedLine delay={0.5}>
                You are a senior full-stack engineer specializing in
              </TypedLine>
              <TypedLine delay={0.6}>
                Next.js 15 and Supabase auth.
              </TypedLine>
              <TypedLine delay={0.7}>
                <span className="text-clay-600">{"</role>"}</span>
              </TypedLine>
              <TypedLine delay={0.85}>
                <span className="text-clay-600">{"<task>"}</span>
              </TypedLine>
              <TypedLine delay={0.95}>
                Implement magic-link auth with route protection
              </TypedLine>
              <TypedLine delay={1.05}>
                via middleware and a callback handler.
              </TypedLine>
              <TypedLine delay={1.15}>
                <span className="text-clay-600">{"</task>"}</span>
              </TypedLine>
              <TypedLine delay={1.3}>
                <span className="text-clay-600">{"<constraints>"}</span>
              </TypedLine>
              <TypedLine delay={1.4}>
                - Do not use NextAuth
              </TypedLine>
              <TypedLine delay={1.5}>
                - No tokens in localStorage
              </TypedLine>
            </div>
          </div>

          {/* Right: score */}
          <div className="col-span-12 md:col-span-3 p-5 border-t md:border-t-0 border-ink-100/60 bg-gradient-to-br from-clay-50/40 to-cream-50/40">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-3">
              Prompt Score
            </div>
            <div className="flex items-end gap-1 mb-4">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="font-serif text-4xl font-medium text-ink-900 tabular-nums leading-none"
              >
                87
              </motion.span>
              <span className="text-[11px] text-ink-400 mb-0.5">/ 100</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Clarity", v: 92 },
                { label: "Context", v: 88 },
                { label: "Constraints", v: 84 },
                { label: "Format", v: 90 },
                { label: "Tool fit", v: 89 },
              ].map((d, i) => (
                <div key={d.label} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-ink-600">{d.label}</span>
                    <span className="text-ink-400 font-mono">{d.v}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-cream-200 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.v}%` }}
                      transition={{ delay: 1.7 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-clay-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4 }}
              className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-clay-700 bg-clay-500/10 rounded-full px-2 py-0.5"
            >
              <CheckCircle2 className="size-3" />
              Strong
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TypedLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
