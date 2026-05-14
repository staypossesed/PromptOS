"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Lightbulb, Loader2, RefreshCw, TrendingUp, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PromptScore } from "@/types/prompt";

interface ScorePanelProps {
  score: PromptScore | null;
  isScoring?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOptimize?: () => void;
  isOptimizing?: boolean;
  optimizeError?: string | null;
}

export function ScorePanel({
  score,
  isScoring,
  error,
  onRetry,
  onOptimize,
  isOptimizing,
  optimizeError,
}: ScorePanelProps) {
  if (!score) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          {isScoring ? (
            <div className="w-full space-y-4 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 bg-cream-200 rounded-full w-24" />
                <div className="h-5 bg-cream-200 rounded-full w-16" />
              </div>
              <div className="h-10 bg-cream-100 rounded-xl w-3/4" />
              <div className="h-px bg-cream-200 my-2" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-cream-200 rounded-full w-28" />
                    <div className="h-3 bg-cream-200 rounded-full w-6" />
                  </div>
                  <div className="h-1.5 bg-cream-200 rounded-full" />
                  <div className="h-2.5 bg-cream-100 rounded-full w-4/5" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center">
              <div className="size-12 rounded-2xl bg-cream-100 flex items-center justify-center mb-4">
                <AlertTriangle className="size-5 text-clay-500" />
              </div>
              <p className="text-sm font-medium text-ink-700 mb-1">Scoring failed</p>
              <p className="text-xs text-ink-400 leading-relaxed max-w-[200px] mb-5">
                {error}
              </p>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="size-3.5" />
                  Retry scoring
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="size-12 rounded-2xl bg-cream-100 flex items-center justify-center mb-4">
                <TrendingUp className="size-5 text-ink-300" />
              </div>
              <p className="text-sm font-medium text-ink-600 mb-1">Score appears here</p>
              <p className="text-[13px] text-ink-400 leading-relaxed max-w-[210px]">
                Generate once. Umprompt scores across 6 dimensions and shows exactly what to improve.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { overall, dimensions } = score;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      {/* Header with overall score */}
      <div className="relative px-5 pt-5 pb-4 border-b border-ink-100/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-clay-50 via-cream-50 to-cream-100 opacity-60 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <TrendingUp className="size-3" />
              Prompt Score
              {isScoring && <Loader2 className="size-3 animate-spin ml-0.5" />}
            </div>
            <Grade score={overall} />
          </div>
          <div className="flex items-end gap-2">
            <span className="font-serif text-5xl font-medium text-ink-900 tabular-nums leading-none">
              {overall}
            </span>
            <span className="text-sm text-ink-400 mb-1">/ 100</span>
          </div>
          <div className="text-xs text-ink-500 mt-1.5">
            {overall >= 90
              ? "Excellent. This prompt is ready to ship."
              : overall >= 80
              ? "Strong. Small tweaks available — or ship as-is."
              : overall >= 65
              ? "Decent start. Auto-fix the weak dimensions below."
              : "Needs work. Hit optimize to improve the low scores."}
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {dimensions.map((dim, i) => (
          <ScoreDimensionRow key={dim.key} dim={dim} delay={i * 0.04} />
        ))}
      </div>

      {/* Optimize CTA */}
      <div className="border-t border-ink-100/60 p-4 bg-cream-50/40 space-y-2">
        <Button
          className="w-full"
          variant="default"
          onClick={onOptimize}
          disabled={isOptimizing || isScoring}
        >
          {isOptimizing ? (
            <><Loader2 className="size-3.5 animate-spin" />Optimizing…</>
          ) : (
            <><Wand2 className="size-3.5" />Auto-fix weak dimensions</>
          )}
        </Button>
        {optimizeError && (
          <p className="text-[11px] text-destructive text-center leading-snug">
            {optimizeError}
          </p>
        )}
      </div>
    </div>
  );
}

function ScoreDimensionRow({
  dim,
  delay,
}: {
  dim: PromptScore["dimensions"][number];
  delay: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-800">{dim.label}</span>
        <span className={cn("text-xs font-mono tabular-nums", scoreColor(dim.score))}>
          {dim.score}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-cream-200/80 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${dim.score}%` }}
          transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
          className={cn("h-full rounded-full", scoreBar(dim.score))}
        />
      </div>
      <div className="flex items-start gap-1.5 pt-0.5">
        <Lightbulb className="size-3 text-clay-500 mt-0.5 shrink-0" />
        <span className="text-[11px] leading-snug text-ink-400">{dim.tip}</span>
      </div>
    </div>
  );
}

function Grade({ score }: { score: number }) {
  const { label, classes } = gradeInfo(score);
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5", classes)}>
      {label}
    </span>
  );
}

function gradeInfo(score: number) {
  if (score >= 90) return { label: "Excellent", classes: "bg-clay-500/15 text-clay-700" };
  if (score >= 80) return { label: "Strong", classes: "bg-clay-500/10 text-clay-600" };
  if (score >= 65) return { label: "Decent", classes: "bg-cream-200 text-ink-600" };
  return { label: "Needs work", classes: "bg-ink-100 text-ink-600" };
}

function scoreColor(score: number) {
  if (score >= 85) return "text-clay-700";
  if (score >= 70) return "text-ink-700";
  return "text-ink-500";
}

function scoreBar(score: number) {
  if (score >= 85) return "bg-clay-500";
  if (score >= 70) return "bg-clay-400";
  return "bg-ink-300";
}
