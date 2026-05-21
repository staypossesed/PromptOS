"use client";

import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { PromptSummary } from "@/types/prompt";

const TOOL_META: Record<string, { label: string; dot: string }> = {
  claude:  { label: "Claude",  dot: "bg-clay-500" },
  cursor:  { label: "Cursor",  dot: "bg-blue-400" },
  chatgpt: { label: "ChatGPT", dot: "bg-emerald-500" },
};

interface PromptCardProps {
  prompt: PromptSummary;
  index?: number;
}

export function PromptCard({ prompt, index = 0 }: PromptCardProps) {
  const tool = TOOL_META[prompt.target_tool] ?? { label: prompt.target_tool, dot: "bg-ink-300" };
  const score = prompt.score?.overall ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/builder?id=${prompt.id}`}
        className="group block rounded-2xl border border-ink-100/70 bg-card p-5 card-soft hover:border-clay-300/50 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all"
      >
        {/* Top row: badges + arrow */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 rounded-full border border-ink-100/60 bg-cream-50 px-2 py-0.5 shrink-0">
              <span className={cn("size-1.5 rounded-full shrink-0", tool.dot)} />
              <span className="text-[10.5px] font-medium text-ink-600">{tool.label}</span>
            </div>
            {score !== null && <ScoreChip score={score} />}
          </div>
          <ArrowUpRight className="size-4 text-ink-200 group-hover:text-clay-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Title */}
        <h3 className="font-serif text-[16px] font-medium text-ink-900 leading-snug mb-2 group-hover:text-clay-700 transition-colors line-clamp-2">
          {prompt.title}
        </h3>

        {/* Idea preview — clean prose, not monospace */}
        <p className="text-[12.5px] text-ink-400 line-clamp-2 leading-relaxed mb-4">
          {prompt.idea}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-[11px] text-ink-300">
          <Clock className="size-3" />
          <span>{formatRelativeTime(prompt.updated_at)}</span>
        </div>
      </Link>
    </motion.div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const { bg, text } =
    score >= 85
      ? { bg: "bg-clay-500/10", text: "text-clay-700" }
      : score >= 70
      ? { bg: "bg-cream-200/80", text: "text-ink-600" }
      : score >= 50
      ? { bg: "bg-amber-50", text: "text-amber-700" }
      : { bg: "bg-red-50", text: "text-red-600" };

  return (
    <div className={cn("inline-flex items-center gap-1 text-[10.5px] font-mono font-semibold rounded-full px-2 py-0.5", bg, text)}>
      <span className="size-1 rounded-full bg-current opacity-70" />
      {score}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
