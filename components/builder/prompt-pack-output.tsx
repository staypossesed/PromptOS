"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptPack } from "@/types/prompt-pack";
import { track } from "@/lib/analytics";

const TOOL_LABELS: Record<string, { label: string; color: string }> = {
  claude:  { label: "Claude",  color: "bg-orange-50 text-orange-700 border-orange-200/70" },
  cursor:  { label: "Cursor",  color: "bg-purple-50 text-purple-700 border-purple-200/70" },
  chatgpt: { label: "ChatGPT", color: "bg-green-50  text-green-700  border-green-200/70"  },
};

interface PromptPackOutputProps {
  pack: PromptPack | null;
  isGenerating: boolean;
  error: string | null;
}

export function PromptPackOutput({ pack, isGenerating, error }: PromptPackOutputProps) {
  if (isGenerating) {
    return (
      <div className="rounded-2xl border border-ink-100/70 bg-card card-soft flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="size-6 text-clay-500 animate-spin" />
        <p className="text-sm text-ink-400">Generating your prompt pack…</p>
        <p className="text-[11px] text-ink-300">Building 5 coordinated prompts. This takes ~15s.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-card card-soft p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="rounded-2xl border border-ink-100/70 bg-cream-50/60 card-soft flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm text-ink-400">Your prompt pack will appear here.</p>
        <p className="text-[11px] text-ink-300">5 coordinated, execution-ready prompts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-ink-900 leading-snug">{pack.title}</h2>
        <span className="shrink-0 text-[11px] text-ink-400 font-medium">{pack.prompts.length} prompts</span>
      </div>

      {pack.prompts.map((prompt, i) => (
        <PromptCard key={i} prompt={prompt} step={i + 1} packType={pack.pack_type} />
      ))}
    </div>
  );
}

function PromptCard({
  prompt,
  step,
  packType,
}: {
  prompt: PromptPack["prompts"][number];
  step: number;
  packType: string;
}) {
  const [copied, setCopied] = useState(false);
  const tool = TOOL_LABELS[prompt.target_tool] ?? { label: prompt.target_tool, color: "bg-cream-100 text-ink-600 border-ink-200" };

  function handleCopy() {
    navigator.clipboard.writeText(prompt.prompt_text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("prompt_pack_copied", { pack_type: packType, target_tool: prompt.target_tool });
    });
  }

  return (
    <div className="rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink-100/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-5 rounded-full bg-clay-500/10 text-clay-700 text-[10px] font-bold flex items-center justify-center shrink-0">
            {step}
          </span>
          <span className="text-sm font-medium text-ink-800 truncate">{prompt.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-[10px] font-medium uppercase tracking-wider rounded-full border px-2 py-0.5",
            tool.color
          )}>
            {tool.label}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-ink-400 hover:text-ink-700 transition-colors rounded-lg px-2 py-1 hover:bg-cream-100"
          >
            {copied ? (
              <><Check className="size-3.5 text-clay-500" />Copied</>
            ) : (
              <><Copy className="size-3.5" />Copy</>
            )}
          </button>
        </div>
      </div>
      <div className="px-4 py-3 max-h-60 overflow-y-auto">
        <pre className="text-[12px] text-ink-700 leading-relaxed whitespace-pre-wrap font-sans">
          {prompt.prompt_text}
        </pre>
      </div>
    </div>
  );
}
