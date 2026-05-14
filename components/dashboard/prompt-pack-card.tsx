"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PACK_TYPES } from "@/types/prompt-pack";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { PromptPackSummary } from "@/types/prompt-pack";

interface PromptPackCardProps {
  pack: PromptPackSummary;
  index?: number;
}

export function PromptPackCard({ pack, index = 0 }: PromptPackCardProps) {
  const packTypeInfo = PACK_TYPES.find((p) => p.id === pack.pack_type);
  const firstPrompt = pack.prompts[0];
  const preview = firstPrompt?.title ?? firstPrompt?.prompt_text?.slice(0, 120) ?? "No prompts";
  const relativeTime = formatRelativeTime(pack.updated_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/builder?pack=${pack.id}`}
        className="group block rounded-2xl border border-ink-100/70 bg-card p-5 card-soft hover:border-clay-300/50 hover:card-soft-lg transition-all"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="shrink-0">
              {packTypeInfo?.emoji} {packTypeInfo?.label ?? pack.pack_type}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-mono font-medium rounded-full px-2 py-0.5",
                "bg-cream-200 text-ink-600"
              )}
            >
              <Layers className="size-2.5" />
              {pack.prompts.length} prompts
            </span>
          </div>
          <ArrowUpRight className="size-4 text-ink-300 group-hover:text-clay-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        <h3 className="font-serif text-[17px] font-medium text-ink-900 leading-tight mb-1.5 group-hover:text-clay-700 transition-colors line-clamp-2">
          {pack.title}
        </h3>

        <p className="text-[13px] text-ink-500 line-clamp-2 leading-relaxed mb-4">
          {preview}
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
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
