"use client";

import { Copy, Download, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { ToolId } from "@/lib/mock-data";

const TOOL_LABELS: Record<ToolId, string> = {
  claude: "Claude",
  cursor: "Cursor",
  chatgpt: "ChatGPT",
};

interface PromptOutputProps {
  prompt: string;
  targetTool: ToolId;
  isSaved?: boolean;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

export function PromptOutput({
  prompt,
  targetTool,
  isSaved,
  isGenerating,
  onRegenerate,
}: PromptOutputProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const blob = new Blob([prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const isEmpty = !prompt.trim();
  const showStreamingPlaceholder = isGenerating && isEmpty;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-100/70 bg-white card-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100/60 bg-cream-50/60">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-clay-500/10 flex items-center justify-center">
            <Sparkles className="size-3.5 text-clay-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-900">Generated prompt</div>
            <div className="text-[11px] text-ink-400">
              Optimized for {TOOL_LABELS[targetTool]}
              {!isEmpty && ` · ${prompt.split(/\s+/).filter(Boolean).length} words`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isGenerating ? (
            <Badge variant="default" className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Streaming
            </Badge>
          ) : (
            <Badge variant="soft">{isSaved ? "Saved" : "Draft"}</Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {showStreamingPlaceholder ? (
          <StreamingPlaceholder />
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <div className="size-10 rounded-xl bg-cream-100 flex items-center justify-center mb-3">
              <Sparkles className="size-5 text-ink-300" />
            </div>
            <p className="text-sm text-ink-400 max-w-xs">
              Fill in your idea, pick a tool, and click{" "}
              <span className="font-medium text-ink-600">Generate prompt</span> to see the result here.
            </p>
          </div>
        ) : (
          <pre className="font-mono text-[13px] leading-[1.7] text-ink-800 whitespace-pre-wrap break-words">
            {prompt}
            {isGenerating && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-clay-500 align-middle animate-pulse" />
            )}
          </pre>
        )}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-ink-100/60 bg-cream-50/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={isEmpty || isGenerating}
        >
          <RefreshCw className="size-3.5" />
          Regenerate
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isEmpty || isGenerating}
          >
            <Download className="size-3.5" />
            .md
          </Button>
          <Button
            size="sm"
            onClick={handleCopy}
            disabled={isEmpty || isGenerating}
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StreamingPlaceholder() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 w-24 rounded bg-clay-200/60" />
      <div className="h-3 w-full rounded bg-cream-200" />
      <div className="h-3 w-5/6 rounded bg-cream-200" />
      <div className="h-3 w-2/3 rounded bg-cream-200" />
      <div className="h-2" />
      <div className="h-3 w-20 rounded bg-clay-200/60" />
      <div className="h-3 w-full rounded bg-cream-200" />
      <div className="h-3 w-4/5 rounded bg-cream-200" />
    </div>
  );
}
