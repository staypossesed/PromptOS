"use client";

import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TOOLS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { PromptSummary } from "@/types/prompt";

interface PromptCardProps {
  prompt: PromptSummary;
  index?: number;
}

export function PromptCard({ prompt, index = 0 }: PromptCardProps) {
  const tool = TOOLS.find((t) => t.id === prompt.target_tool);
  const score = prompt.score?.overall ?? null;
  const preview = prompt.generated_prompt.slice(0, 160);

  // Relative time label
  const relativeTime = formatRelativeTime(prompt.updated_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/builder?id=${prompt.id}`}
        className="group block rounded-2xl border border-ink-100/70 bg-white p-5 card-soft hover:border-clay-300/50 hover:card-soft-lg transition-all"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="shrink-0">
              {tool?.name ?? prompt.target_tool}
            </Badge>
            {score !== null && <ScoreChip score={score} />}
          </div>
          <ArrowUpRight className="size-4 text-ink-300 group-hover:text-clay-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        <h3 className="font-serif text-[17px] font-medium text-ink-900 leading-tight mb-1.5 group-hover:text-clay-700 transition-colors line-clamp-2">
          {prompt.title}
        </h3>

        <p className="text-[13px] text-ink-500 line-clamp-2 leading-relaxed mb-4 font-mono">
          {preview}…
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <Clock className="size-3" />
          <span>{relativeTime}</span>
        </div>
      </Link>
    </motion.div>
  );
}

function ScoreChip({ score }: { score: number }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-mono font-medium rounded-full px-2 py-0.5",
        score >= 85
          ? "bg-clay-500/10 text-clay-700"
          : score >= 70
          ? "bg-cream-200 text-ink-600"
          : "bg-ink-100 text-ink-500"
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-60" />
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
