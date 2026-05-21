"use client";

import { useState } from "react";
import { Copy, Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptPack } from "@/types/prompt-pack";
import { track } from "@/lib/analytics";
import { useTranslations } from "@/lib/i18n/use-translations";

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; dot: string }> = {
  claude:  { label: "Claude",  dot: "bg-clay-500" },
  cursor:  { label: "Cursor",  dot: "bg-blue-400" },
  chatgpt: { label: "ChatGPT", dot: "bg-emerald-500" },
};

// ── Markdown-lite renderer (same as prompt-output) ────────────────────────────

type Block =
  | { kind: "h2" | "h3"; text: string }
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
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      if (codeLines.length > 0) blocks.push({ kind: "code", lang, lines: codeLines });
      i++;
      continue;
    }
    if (/^## /.test(line)) { blocks.push({ kind: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (/^### /.test(line)) { blocks.push({ kind: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (/^# /.test(line)) { i++; continue; } // skip h1 (title shown in card header)
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) { items.push(lines[i].replace(/^[-*+] /, "")); i++; }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      blocks.push({ kind: "ol", items });
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    const pLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^#{1,3} /.test(lines[i]) && !lines[i].startsWith("```") && !/^[-*+] /.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      pLines.push(lines[i]);
      i++;
    }
    if (pLines.length > 0) blocks.push({ kind: "p", text: pLines.join("\n") });
  }
  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i} className="font-semibold text-ink-900">{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part))
      return <code key={i} className="font-mono text-[11px] bg-cream-200/80 border border-ink-100/60 px-1 py-0.5 rounded text-ink-700">{part.slice(1, -1)}</code>;
    return part;
  });
}

function PromptRenderer({ text }: { text: string }) {
  const blocks = parsePrompt(text);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h2":
            return (
              <div key={i} className="flex items-center gap-2 pt-2.5 first:pt-0">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-400 shrink-0">{block.text}</span>
                <div className="flex-1 h-px bg-ink-100/80" />
              </div>
            );
          case "h3":
            return <h3 key={i} className="text-[12.5px] font-semibold text-ink-700">{block.text}</h3>;
          case "p":
            return <p key={i} className="text-[12.5px] leading-relaxed text-ink-700">{renderInline(block.text)}</p>;
          case "ul":
            return (
              <ul key={i} className="space-y-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-[7px] size-1 rounded-full bg-clay-400 shrink-0" />
                    <span className="text-[12.5px] leading-relaxed text-ink-700">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-1.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-ink-400 tabular-nums mt-0.5 shrink-0 min-w-[1.1rem]">{j + 1}.</span>
                    <span className="text-[12.5px] leading-relaxed text-ink-700">{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <div key={i} className="rounded-lg overflow-hidden border border-ink-100/80 bg-[#F7F5F2]">
                {block.lang && (
                  <div className="px-3 py-1 border-b border-ink-100/70 bg-[#F3F0EC]">
                    <span className="text-[9.5px] font-mono text-ink-400">{block.lang}</span>
                  </div>
                )}
                <pre className="p-3 font-mono text-[11.5px] leading-[1.6] text-ink-800 overflow-x-auto whitespace-pre-wrap break-words">
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

interface PromptPackOutputProps {
  pack: PromptPack | null;
  isGenerating: boolean;
  error: string | null;
}

export function PromptPackOutput({ pack, isGenerating, error }: PromptPackOutputProps) {
  const { t } = useTranslations();

  if (isGenerating) {
    return (
      <div className="rounded-2xl border border-ink-100/70 bg-card card-soft flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Loader2 className="size-6 text-clay-500 animate-spin" />
        <p className="text-sm font-medium text-ink-700">{t("promptPack.buildingPack")}</p>
        <p className="text-[12px] text-ink-400 max-w-[220px] leading-relaxed">{t("promptPack.buildingSubtitle")}</p>
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
      <div className="rounded-2xl border border-dashed border-ink-200/60 bg-cream-50/40 flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="size-5 rounded-full bg-cream-200 border border-ink-100/60 flex items-center justify-center">
                <span className="text-[8px] font-semibold text-ink-300">{i + 1}</span>
              </div>
              {i < 4 && <ArrowRight className="size-2.5 text-ink-200 mx-0.5" />}
            </div>
          ))}
        </div>
        <p className="text-sm font-semibold text-ink-700 mt-1">{t("promptPack.emptyTitle")}</p>
        <p className="text-[12px] text-ink-400 max-w-[240px] leading-relaxed">{t("promptPack.emptySubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pack header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 mb-1">
            Full execution workflow
          </div>
          <h2 className="font-serif text-xl text-ink-900 leading-snug">{pack.title}</h2>
        </div>
        <span className="shrink-0 text-[10.5px] font-medium text-ink-500 bg-cream-100 border border-ink-100/80 rounded-full px-2.5 py-1 mt-0.5">
          {t("promptPack.prompts", { n: pack.prompts.length })}
        </span>
      </div>

      {/* Flow connector + cards */}
      <div className="space-y-2">
        {pack.prompts.map((prompt, i) => (
          <div key={i} className="relative">
            {i < pack.prompts.length - 1 && (
              <div className="absolute left-[18px] top-full h-2 w-px bg-ink-100/80 z-10" />
            )}
            <PromptCard prompt={prompt} step={i + 1} packType={pack.pack_type} />
          </div>
        ))}
      </div>
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
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslations();
  const tool = TOOL_META[prompt.target_tool] ?? { label: prompt.target_tool, dot: "bg-ink-300" };

  function handleCopy() {
    navigator.clipboard.writeText(prompt.prompt_text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("prompt_pack_copied", { pack_type: packType, target_tool: prompt.target_tool });
    });
  }

  return (
    <div className="rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink-100/60">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        >
          <span className="size-[22px] rounded-full bg-clay-500/10 text-clay-700 text-[10px] font-bold flex items-center justify-center shrink-0">
            {step}
          </span>
          <span className="text-sm font-medium text-ink-800 truncate">{prompt.title}</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-full border border-ink-100/60 bg-cream-50 px-2 py-0.5">
            <span className={cn("size-1.5 rounded-full shrink-0", tool.dot)} />
            <span className="text-[10px] font-medium text-ink-600">{tool.label}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500 hover:text-ink-800 transition-colors rounded-lg px-2.5 py-1.5 hover:bg-cream-100 border border-transparent hover:border-ink-100"
          >
            {copied ? (
              <><Check className="size-3.5 text-clay-500" /><span className="text-clay-600">{t("promptPack.copied")}</span></>
            ) : (
              <><Copy className="size-3.5" />{t("promptPack.copy")}</>
            )}
          </button>
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="px-4 py-3.5 max-h-64 overflow-y-auto border-t border-ink-100/30">
          <PromptRenderer text={prompt.prompt_text} />
        </div>
      )}
    </div>
  );
}
