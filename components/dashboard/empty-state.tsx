import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STARTER_ACTIONS = [
  { label: "Build with Cursor", tool: "cursor", href: "/builder?template=cursor-auth-flow" },
  { label: "Write with ChatGPT", tool: "chatgpt", href: "/builder?template=chatgpt-cold-email" },
  { label: "Research with Claude", tool: "claude", href: "/builder?template=claude-competitor-analysis" },
];

export function EmptyState() {
  return (
    <div className="relative rounded-3xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      {/* Decorative dot grid */}
      <div className="absolute inset-0 bg-dotgrid opacity-40 pointer-events-none" />
      {/* Soft clay glow */}
      <div className="absolute -top-32 -right-32 size-64 rounded-full bg-clay-200/40 blur-3xl pointer-events-none" />

      <div className="relative p-10 md:p-14 text-center max-w-lg mx-auto">
        <div className="size-12 rounded-2xl bg-clay-500/10 mx-auto mb-5 flex items-center justify-center">
          <Sparkles className="size-5 text-clay-600" />
        </div>
        <h3 className="font-serif text-2xl font-medium text-ink-900 mb-2">
          Your prompt workspace is empty.
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed mb-7 text-pretty max-w-sm mx-auto">
          Start with a rough idea — Umprompt turns it into a scored, optimized prompt ready to paste into Claude, Cursor, or ChatGPT.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-5">
          {STARTER_ACTIONS.map((action) => (
            <Button key={action.label} asChild variant="outline" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>

        <p className="text-[11px] text-ink-400">
          Or{" "}
          <Link href="/builder" className="text-clay-600 hover:underline font-medium">
            start from scratch
          </Link>
        </p>
      </div>
    </div>
  );
}
