import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = ["Claude", "Cursor", "Codex", "ChatGPT"] as const;
const ACTIVE_TOOL = "Cursor";

const SCORE_DIMS = [
  { label: "Clarity", value: 95 },
  { label: "Context", value: 88 },
  { label: "Constraints", value: 91 },
  { label: "Tool fit", value: 94 },
];

const PROMPT_SECTIONS = [
  {
    label: "Goal",
    text: "Set up Supabase authentication and a protected /dashboard route in Next.js 15 App Router.",
  },
  {
    label: "Files to inspect",
    text: "app/layout.tsx · middleware.ts · lib/supabase/",
  },
  {
    label: "Implementation steps",
    items: [
      "Install @supabase/ssr, add server + client helpers",
      "Configure middleware to validate session on each request",
      "Guard /dashboard with a server-side session check",
    ],
  },
  {
    label: "Do not break",
    items: [
      "middleware.ts matcher — keep public routes open",
      "Existing /login and /signup flows",
    ],
  },
  {
    label: "Acceptance criteria",
    items: [
      "Unauthenticated /dashboard visit redirects to /login",
      "Magic-link sign-in lands on /dashboard with session",
    ],
  },
];

export function HeroMockup() {
  return (
    <div className="relative w-full">
      {/* Glow halo */}
      <div className="absolute inset-x-12 -bottom-8 h-20 rounded-full bg-clay-400/20 blur-3xl pointer-events-none" />

      {/* Outer shell */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.09] bg-[#181310] shadow-[0_32px_80px_rgba(0,0,0,0.45)]">

        {/* Window chrome */}
        <div className="flex items-center gap-5 px-4 h-10 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-[#FF605C]/80" />
            <div className="size-2.5 rounded-full bg-[#FFBD44]/80" />
            <div className="size-2.5 rounded-full bg-[#00CA4E]/80" />
          </div>
          <div className="text-[11px] text-white/20 font-mono hidden sm:block">
            umprompt.com/builder
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            {TOOLS.map((t) => (
              <span
                key={t}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                  t === ACTIVE_TOOL
                    ? "bg-clay-500/80 text-white/90"
                    : "text-white/25"
                )}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-[1fr_52px_1fr] gap-3 items-stretch">

          {/* Left: rough idea */}
          <div className="rounded-xl bg-[#221D17] border border-white/[0.07] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/30">
                Rough idea
              </span>
              <span className="text-[10px] text-white/20">Tool: Cursor</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/65 leading-relaxed">
                Build Supabase auth and a dashboard in my Next.js app
                <span className="inline-block w-[2px] h-3.5 bg-clay-500/70 ml-0.5 -mb-0.5 animate-pulse" />
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06]">
              <span className="text-[10px] text-white/20 italic">
                No structure. No context. No constraints.
              </span>
            </div>
          </div>

          {/* Center: transform indicator */}
          <div className="flex md:flex-col flex-row items-center justify-center gap-2 py-1 md:py-0">
            <div className="size-8 rounded-xl bg-clay-500/15 border border-clay-500/25 flex items-center justify-center shrink-0">
              <Sparkles className="size-3.5 text-clay-400" />
            </div>
            <ArrowRight className="size-3.5 text-white/20 rotate-90 md:rotate-0 shrink-0" />
            <div className="rounded-full bg-clay-500/20 border border-clay-500/30 px-2 py-0.5 text-[11px] font-bold text-clay-400 shrink-0">
              91
            </div>
          </div>

          {/* Right: optimized prompt */}
          <div className="rounded-xl bg-[#FFFDF8] border border-ink-100/50 p-4 flex flex-col gap-0 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-400">
                Optimized prompt
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-clay-600">
                <CheckCircle2 className="size-3" />
                91 / 100
              </span>
            </div>

            <div className="space-y-2.5 flex-1">
              {PROMPT_SECTIONS.map((s) => (
                <div key={s.label}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-clay-500/80 mb-1">
                    {s.label}
                  </div>
                  {"text" in s ? (
                    <p className="text-[11px] text-ink-600 leading-relaxed line-clamp-2">
                      {s.text}
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {s.items.slice(0, 2).map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-1.5 text-[11px] text-ink-500 leading-snug"
                        >
                          <CheckCircle2 className="size-2.5 text-clay-500 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Fade suggesting more content below */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FFFDF8] to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Score strip */}
        <div className="border-t border-white/[0.07] px-4 md:px-5 py-3 flex items-center gap-4 md:gap-6 overflow-x-auto">
          <div className="shrink-0 flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold text-white/40">Score</span>
            <span className="text-sm font-bold text-clay-400 tabular-nums">91/100</span>
          </div>
          <div className="w-px h-4 bg-white/[0.08] shrink-0 hidden md:block" />
          {SCORE_DIMS.map((d) => (
            <div key={d.label} className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-white/35 w-[54px]">{d.label}</span>
              <div className="w-16 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-clay-500/80"
                  style={{ width: `${d.value}%` }}
                />
              </div>
              <span className="text-[10px] text-white/25 tabular-nums w-5 text-right">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
