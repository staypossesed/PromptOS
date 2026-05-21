"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { PromptPackSummary } from "@/types/prompt-pack";
import { PACK_TYPES } from "@/types/prompt-pack";

interface PromptPackCardProps {
  pack: PromptPackSummary;
  index?: number;
}

export function PromptPackCard({ pack, index = 0 }: PromptPackCardProps) {
  const packTypeInfo = PACK_TYPES.find((p) => p.id === pack.pack_type);
  const stepTitles = pack.prompts.slice(0, 3).map((p) => p.title).filter(Boolean);
  const relativeTime = formatRelativeTime(pack.updated_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/builder?pack=${pack.id}`}
        className="group block rounded-2xl border border-ink-100/70 bg-card p-5 card-soft hover:border-clay-300/50 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all"
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {packTypeInfo && (
              <div className="flex items-center gap-1.5 rounded-full border border-ink-100/60 bg-cream-50 px-2 py-0.5 shrink-0">
                <span className="text-[11px]">{packTypeInfo.emoji}</span>
                <span className="text-[10.5px] font-medium text-ink-600">{packTypeInfo.label}</span>
              </div>
            )}
            <div className="flex items-center gap-1 rounded-full bg-clay-500/8 border border-clay-200/40 px-2 py-0.5 shrink-0">
              <span className="text-[10.5px] font-medium text-clay-700">{pack.prompts.length} steps</span>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-ink-200 group-hover:text-clay-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Title */}
        <h3 className="font-serif text-[16px] font-medium text-ink-900 leading-snug mb-2.5 group-hover:text-clay-700 transition-colors line-clamp-2">
          {pack.title}
        </h3>

        {/* Step preview — show first 3 step titles as a mini-flow */}
        {stepTitles.length > 0 && (
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            {stepTitles.map((title, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[11px] text-ink-400 truncate max-w-[80px]">{title}</span>
                {i < stepTitles.length - 1 && <ArrowRight className="size-2.5 text-ink-200 shrink-0" />}
              </span>
            ))}
            {pack.prompts.length > 3 && (
              <span className="text-[11px] text-ink-300">+{pack.prompts.length - 3} more</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={cn("flex items-center gap-1.5 text-[11px] text-ink-300", !stepTitles.length && "mt-2")}>
          <Clock className="size-3" />
          <span>{relativeTime}</span>
        </div>
      </Link>
    </motion.div>
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
