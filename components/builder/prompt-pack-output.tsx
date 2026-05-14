"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptPack } from "@/types/prompt-pack";
import { track } from "@/lib/analytics";

const TOOL_LABELS: Record<string, { label: string; color: string }> = {
  claude:  { label: "Claude",  color: "bg-clay-50 text-clay-700 border-clay-200/60" },
  cursor:  { label: "Cursor",  color: "bg-cream-100 text-ink-700 border-ink-200/70" },
  chatgpt: { label: "ChatGPT", color: "bg-white text-ink-600 border-ink-200" },
};

interface PromptPackOutputProps {
  pack: PromptPack | null;
  isGenerating: boolean;
  error: string | null;
}

export function PromptPackOutput({ pack, isGenerating, error }: PromptPackOutputProps) {
  if (isGenerating) {
    return (
      <div className="rounded-2xl border border-ink-100/70 bg-card card-soft flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Loader2 className="size-6 text-clay-500 animate-spin" />
        <p className="text-sm font-medium text-ink-600">Building your prompt pack…</p>
        <p className="text-[12px] text-ink-400 max-w-[220px] leading-relaxed">5 coordinated prompts. Takes about 15 seconds.</p>
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
      <div className="rounded-2xl border border-ink-100/70 bg-cream-50/60 card-soft flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
        <div className="size-10 rounded-xl bg-cream-100 flex items-center justify-center mb-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-300">
            <rect x="2" y="3" width="16" height="3" rx="1.5" fill="currentColor" opacity=".5"/>
            <rect x="2" y="8.5" width="16" height="3" rx="1.5" fill="currentColor" opacity=".35"/>
            <rect x="2" y="14" width="10" height="3" rx="1.5" fill="currentColor" opacity=".2"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-ink-600">Your 5-prompt pack appears here</p>
        <p className="text-[12px] text-ink-400 max-w-[240px] leading-relaxed">
          Each prompt hands off cleanly to the next — no context lost, no repetition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-xl text-ink-900 leading-snug">{pack.title}</h2>
        <span className="shrink-0 text-[11px] font-medium text-ink-500 bg-cream-100 border border-ink-100 rounded-full px-2.5 py-0.5">
          {pack.prompts.length} prompts
        </span>
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
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500 hover:text-ink-800 transition-colors rounded-lg px-2.5 py-1.5 hover:bg-cream-100 border border-transparent hover:border-ink-100"
          >
            {copied ? (
              <><Check className="size-3.5 text-clay-500" /><span className="text-clay-600">Copied</span></>
            ) : (
              <><Copy className="size-3.5" />Copy</>
            )}
          </button>
        </div>
      </div>
      <div className="px-4 py-3 max-h-56 overflow-y-auto">
        <pre className="text-[12px] text-ink-700 leading-[1.7] whitespace-pre-wrap font-mono">
          {prompt.prompt_text}
        </pre>
      </div>
    </div>
  );
}
