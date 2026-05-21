"use client";

import { Copy, Download, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ToolId } from "@/lib/mock-data";
import { track } from "@/lib/analytics";
import { useTranslations } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<ToolId, { label: string; dot: string }> = {
  claude:  { label: "Claude",  dot: "bg-clay-500" },
  cursor:  { label: "Cursor",  dot: "bg-blue-400" },
  chatgpt: { label: "ChatGPT", dot: "bg-emerald-500" },
};

// ── Markdown-lite renderer ────────────────────────────────────────────────────

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lang: string; lines: string[] };

function parsePrompt(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (codeLines.length > 0) blocks.push({ kind: "code", lang, lines: codeLines });
      i++;
      continue;
    }

    // Headings
    if (/^# /.test(line)) { blocks.push({ kind: "h1", text: line.slice(2).trim() }); i++; continue; }
    if (/^## /.test(line)) { blocks.push({ kind: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (/^### /.test(line)) { blocks.push({ kind: "h3", text: line.slice(4).trim() }); i++; continue; }

    // Bullet list — collect contiguous items
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Numbered list — collect contiguous items
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") { i++; continue; }

    // Paragraph — collect until a block-level boundary
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3} /.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ kind: "p", text: paragraphLines.join("\n") });
    }
  }

  return blocks;
}

// Inline markdown: **bold** and `code`
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i} className="font-semibold text-ink-900">{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part))
      return (
        <code key={i} className="font-mono text-[11.5px] bg-cream-200/80 border border-ink-100/60 px-1 py-0.5 rounded text-ink-700">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function PromptRenderer({ text }: { text: string }) {
  const blocks = parsePrompt(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h1":
            return (
              <h1 key={i} className="font-serif text-base font-medium text-ink-900 pt-2">
                {block.text}
              </h1>
            );
          case "h2":
            return (
              <div key={i} className="flex items-center gap-2.5 pt-4 first:pt-1">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-400 shrink-0">
                  {block.text}
                </span>
                <div className="flex-1 h-px bg-ink-100/80" />
              </div>
            );
          case "h3":
            return (
              <h3 key={i} className="text-sm font-semibold text-ink-700 pt-2">
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="text-[13.5px] leading-relaxed text-ink-700">
                {renderInline(block.text)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-1.5 pl-0.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="mt-[7px] size-1 rounded-full bg-clay-400 shrink-0" />
                    <span className="text-[13.5px] leading-relaxed text-ink-700">
                      {renderInline(item)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-2 pl-0.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="text-[11px] font-mono text-ink-400 tabular-nums mt-0.5 shrink-0 min-w-[1.25rem]">
                      {j + 1}.
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-ink-700">
                      {renderInline(item)}
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <div key={i} className="rounded-xl overflow-hidden border border-ink-100/80 bg-[#F7F5F2]">
                {block.lang && (
                  <div className="px-3.5 py-1.5 border-b border-ink-100/70 bg-[#F3F0EC]">
                    <span className="text-[10px] font-mono text-ink-400">{block.lang}</span>
                  </div>
                )}
                <pre className="p-3.5 font-mono text-[12px] leading-[1.65] text-ink-800 overflow-x-auto whitespace-pre-wrap break-words">
                  {block.lines.join("\n")}
                </pre>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PromptOutputProps {
  prompt: string;
  targetTool: ToolId;
  isSaved?: boolean;
  isGenerating?: boolean;
  isOptimizing?: boolean;
  onRegenerate?: () => void;
}

export function PromptOutput({
  prompt,
  targetTool,
  isSaved,
  isGenerating,
  isOptimizing,
  onRegenerate,
}: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslations();

  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    track("prompt_copied", { target_tool: targetTool });
  }

  function handleDownload() {
    const blob = new Blob([prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt.md";
    a.click();
    URL.revokeObjectURL(url);
    track("prompt_downloaded", { target_tool: targetTool });
  }

  const isEmpty = !prompt.trim();
  const toolMeta = TOOL_META[targetTool];
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;

  const statusLabel = isGenerating
    ? t("promptOutput.streaming")
    : isOptimizing
    ? t("promptOutput.optimizing")
    : isSaved
    ? t("promptOutput.saved")
    : isEmpty
    ? ""
    : t("promptOutput.draft");

  const statusClass = isGenerating || isOptimizing
    ? "text-clay-600 bg-clay-500/8 border-clay-200/60"
    : isSaved
    ? "text-emerald-700 bg-emerald-50 border-emerald-200/60"
    : "text-ink-500 bg-cream-100 border-ink-100/60";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100/60 bg-cream-50/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0 rounded-full border border-ink-100/60 bg-white px-2.5 py-1">
            <span className={cn("size-1.5 rounded-full", toolMeta.dot)} />
            <span className="text-[11px] font-medium text-ink-600">{toolMeta.label}</span>
          </div>
          {wordCount > 0 && !isGenerating && (
            <span className="text-[11px] text-ink-400 tabular-nums">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          )}
        </div>
        {statusLabel && (
          <span className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium rounded-full border px-2.5 py-0.5 shrink-0",
            statusClass
          )}>
            {(isGenerating || isOptimizing) && <Loader2 className="size-2.5 animate-spin" />}
            {statusLabel}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isGenerating && isEmpty ? (
          <div className="p-5">
            <StreamingPlaceholder />
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
            <div className="w-10 h-10 mb-4 rounded-xl bg-cream-100 border border-ink-100/60 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-ink-300">
                <path d="M3 4h12M3 8h8M3 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink-700 mb-1.5">
              Your prompt will appear here.
            </p>
            <p className="text-[12.5px] text-ink-400 leading-relaxed max-w-[230px]">
              Give Umprompt a rough idea. It returns a structured prompt ready for your AI tool.
            </p>
          </div>
        ) : isGenerating ? (
          /* Streaming: raw pre with cursor */
          <div className="p-5">
            <pre className="font-mono text-[12.5px] leading-[1.75] text-ink-800 whitespace-pre-wrap break-words">
              {prompt}
              <span className="inline-block w-1.5 h-[14px] ml-0.5 bg-clay-500 align-middle animate-pulse rounded-sm" />
            </pre>
          </div>
        ) : (
          /* Formatted document view */
          <div className="px-5 py-4">
            <PromptRenderer text={prompt} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-ink-100/60 bg-cream-50/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={isEmpty || isGenerating || isOptimizing}
          className="text-ink-500 hover:text-ink-700"
        >
          <RefreshCw className="size-3.5" />
          {t("promptOutput.regenerate")}
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isEmpty || isGenerating}
            className="text-ink-500"
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
            {copied ? t("promptOutput.copied") : t("promptOutput.copy")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StreamingPlaceholder() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-20 rounded-full bg-clay-200/60" />
        <div className="flex-1 h-px bg-ink-100/60" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="h-3 w-full rounded-full bg-cream-200" />
        <div className="h-3 w-5/6 rounded-full bg-cream-200" />
        <div className="h-3 w-4/5 rounded-full bg-cream-200" />
      </div>
      <div className="flex items-center gap-2.5 pt-2">
        <div className="h-2 w-24 rounded-full bg-clay-200/50" />
        <div className="flex-1 h-px bg-ink-100/60" />
      </div>
      <div className="space-y-2 pt-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mt-1.5 size-1 rounded-full bg-cream-200 shrink-0" />
            <div className={cn("h-3 rounded-full bg-cream-200", i % 3 === 0 ? "w-4/5" : i % 3 === 1 ? "w-full" : "w-3/4")} />
          </div>
        ))}
      </div>
    </div>
  );
}
