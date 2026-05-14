"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { IdeaInput } from "@/components/builder/idea-input";
import { ToolSelector } from "@/components/builder/tool-selector";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Trophy,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { ToolId } from "@/lib/mock-data";
import type {
  ModelLabResult,
  ModelComparisonSummary,
} from "@/types/model-comparison";
import { WINNER_REASONS } from "@/types/model-comparison";

// ─── Selectable models ─────────────────────────────────────────────────────

const LAB_MODELS = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    costHint: "$3 / $15 per MTok",
    defaultChecked: true,
    experimental: false,
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    costHint: "$1 / $5 per MTok",
    defaultChecked: false,
    experimental: false,
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    provider: "OpenRouter",
    costHint: "$0.74 / $3.49 per MTok",
    defaultChecked: true,
    experimental: true,
  },
] as const;

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ModelLabPage() {
  const router = useRouter();

  // ── Compare state ──────────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolId>("cursor");
  const [selectedModels, setSelectedModels] = useState<string[]>(
    LAB_MODELS.filter((m) => m.defaultChecked).map((m) => m.id)
  );
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<ModelLabResult[] | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  // ── Save + winner state ────────────────────────────────────────────────
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [isSavingComparison, setIsSavingComparison] = useState(false);
  const [winnerModel, setWinnerModel] = useState<string | null>(null);
  const [winnerReason, setWinnerReason] = useState<string | null>(null);
  const [winnerPickingFor, setWinnerPickingFor] = useState<string | null>(null);
  const [isSavingWinner, setIsSavingWinner] = useState(false);

  // ── History state ──────────────────────────────────────────────────────
  const [history, setHistory] = useState<ModelComparisonSummary[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Load history ───────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/model-lab/comparisons");
      if (res.ok) {
        const json = await res.json();
        setHistory(json.data ?? []);
      }
    } catch {
      // best-effort
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    track("model_lab_opened");
    loadHistory();
  }, [loadHistory]);

  // ── Auto-save comparison after results come in ─────────────────────────
  const saveComparison = useCallback(
    async (savedResults: ModelLabResult[], savedIdea: string, savedTool: ToolId, savedModels: string[]) => {
      setIsSavingComparison(true);
      try {
        const res = await fetch("/api/model-lab/comparisons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: savedIdea,
            target_tool: savedTool,
            models_compared: savedModels,
            results: savedResults,
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.data?.id) {
          setComparisonId(json.data.id);
        }
        loadHistory();
      } catch {
        // best-effort — save failure doesn't break the lab
      } finally {
        setIsSavingComparison(false);
      }
    },
    [loadHistory]
  );

  // ── Compare ────────────────────────────────────────────────────────────
  const handleCompare = useCallback(async () => {
    if (!idea.trim() || selectedModels.length === 0 || isComparing) return;

    setIsComparing(true);
    setResults(null);
    setCompareError(null);
    setExpandedModels(new Set());
    setComparisonId(null);
    setWinnerModel(null);
    setWinnerReason(null);
    setWinnerPickingFor(null);

    try {
      const res = await fetch("/api/model-lab/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, target_tool: tool, models: selectedModels }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const retryMsg =
            typeof json.retryAfterSeconds === "number"
              ? `Try again in ${formatRetryAfter(json.retryAfterSeconds)}.`
              : "Try again later.";
          const limitHint = typeof json.limit === "number" ? ` (${json.limit}/day)` : "";
          throw new Error(`Model Lab limit reached${limitHint}. ${retryMsg}`);
        }
        throw new Error(json.error ?? "Comparison failed.");
      }

      const data: ModelLabResult[] = json.data;
      setResults(data);

      // Capture current values for the async save (closures would go stale)
      const snapshotIdea = idea;
      const snapshotTool = tool;
      const snapshotModels = [...selectedModels];
      saveComparison(data, snapshotIdea, snapshotTool, snapshotModels);

      const shortNames = data.map((r) => r.shortName).join(",");
      track("model_comparison_run", {
        target_tool: tool,
        models_compared: shortNames,
        model_count: selectedModels.length,
      });
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  }, [idea, tool, selectedModels, isComparing, saveComparison]);

  // ── Copy ───────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async (result: ModelLabResult) => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopiedModel(result.model);
      setTimeout(() => setCopiedModel(null), 2000);
    } catch {
      showToast("error", "Copy failed — try selecting the text manually.");
    }
  }, []);

  // ── Use output in Builder ──────────────────────────────────────────────
  const handleUseOutput = useCallback(
    (result: ModelLabResult) => {
      if (!result.output || result.error) {
        showToast("error", "Cannot use this output — the model failed.");
        return;
      }
      sessionStorage.setItem(
        "ump:lab_output",
        JSON.stringify({
          idea,
          tool,
          generatedPrompt: result.output,
          score: result.score ?? null,
          model: result.shortName,
          source: "model-lab",
        })
      );
      track("model_output_used", {
        selected_model: result.shortName,
        score_overall: result.score?.overall,
      });
      router.push("/builder");
    },
    [idea, tool, router]
  );

  // ── Mark winner ────────────────────────────────────────────────────────
  const handleMarkWinner = useCallback(
    async (result: ModelLabResult, reason: string) => {
      if (!comparisonId) return;
      setIsSavingWinner(true);
      try {
        const res = await fetch(`/api/model-lab/comparisons/${comparisonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winner_model: result.model, winner_reason: reason }),
        });
        if (!res.ok) {
          const json = await res.json();
          showToast("error", json.error ?? "Failed to save winner.");
          return;
        }
        setWinnerModel(result.model);
        setWinnerReason(reason);
        setWinnerPickingFor(null);
        showToast("success", `${result.displayName} marked as winner.`);
        track("model_winner_selected", {
          winner_model: result.shortName,
          target_tool: tool,
          reason,
          score_overall: result.score?.overall,
          latencyMs: result.latencyMs,
          estimatedCostUSD: result.estimatedCostUSD ?? undefined,
        });
        loadHistory();
      } catch {
        showToast("error", "Failed to save winner.");
      } finally {
        setIsSavingWinner(false);
      }
    },
    [comparisonId, tool, loadHistory]
  );

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleExpanded = (modelId: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      next.has(modelId) ? next.delete(modelId) : next.add(modelId);
      return next;
    });
  };

  const canCompare = idea.trim().length > 0 && selectedModels.length > 0;
  const showWinner = results !== null && results.length > 1;

  return (
    <AppShell>
      <Topbar
        breadcrumb={[
          { label: "Workspace" },
          { label: "Model Lab" },
        ]}
      />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all",
            toast.kind === "success"
              ? "border-sage-200 bg-card text-ink-800"
              : "border-destructive/20 bg-card text-destructive"
          )}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="size-4 text-sage-600 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-2">
            <FlaskConical className="size-3.5" />
            Internal tool · beta
          </div>
          <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-ink-900 leading-tight">
            Model Lab
          </h1>
          <p className="text-sm text-ink-400 mt-1">
            Compare Claude and Kimi side by side. Same idea, same tool — see which output you&apos;d ship.
          </p>

          {/* Decision helper note + checklist */}
          <div className="mt-4 rounded-xl border border-ink-100/80 bg-cream-50 px-4 py-3 space-y-2">
            <div className="flex items-start gap-2.5 text-sm text-ink-500">
              <Info className="size-4 shrink-0 mt-0.5 text-ink-400" />
              <span>
                Use this lab to compare quality, cost, and latency before changing the default production model.
              </span>
            </div>
            <div className="pl-6 space-y-1">
              {[
                "Compare at least 10 prompts before changing defaults.",
                "Watch score, latency, cost, and failure rate.",
                "Do not switch free users to a model that times out often.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5 text-[12px] text-ink-400">
                  <span className="mt-0.5 leading-none select-none">·</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── Left: input panel ──────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5 space-y-5">
              <IdeaInput value={idea} onChange={setIdea} />
              <ToolSelector value={tool} onChange={setTool} />

              {/* Model selector */}
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                  Models to compare
                </div>
                <div className="space-y-2">
                  {LAB_MODELS.map((m) => {
                    const checked = selectedModels.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModel(m.id)}
                        className={cn(
                          "w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                          checked
                            ? "border-clay-300/60 bg-clay-50/60"
                            : "border-ink-100/60 bg-white hover:border-ink-200"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 size-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors",
                            checked
                              ? "border-clay-500 bg-clay-500"
                              : "border-ink-300 bg-white"
                          )}
                        >
                          {checked && <Check className="size-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="text-sm font-medium text-ink-800">{m.label}</div>
                            {m.experimental && (
                              <span className="text-[10px] font-medium bg-[#D9952F]/10 text-[#7A520E] border border-[#D9952F]/30 rounded-full px-1.5 py-0.5 leading-none">
                                Experimental
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-400 mt-0.5">
                            {m.provider} · {m.costHint}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-ink-400 leading-relaxed">
                  Kimi is being tested for lower-cost generation. Claude remains the production default.
                </p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleCompare}
              disabled={!canCompare || isComparing}
            >
              {isComparing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Comparing…
                </>
              ) : (
                <>
                  <FlaskConical className="size-4" />
                  {results ? "Re-compare" : "Generate comparison"}
                </>
              )}
            </Button>
          </div>

          {/* ── Right: results ──────────────────────────────────────────── */}
          <div className="lg:col-span-8">
            {/* Error state */}
            {compareError && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 flex items-start gap-3">
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">{compareError}</div>
              </div>
            )}

            {/* Loading skeleton */}
            {isComparing && (
              <div
                className={cn(
                  "grid gap-4",
                  selectedModels.length <= 1 ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
                )}
              >
                {selectedModels.map((id) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5 animate-pulse"
                  >
                    <div className="h-4 bg-cream-200 rounded w-1/2 mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-cream-100 rounded w-full" />
                      <div className="h-3 bg-cream-100 rounded w-5/6" />
                      <div className="h-3 bg-cream-100 rounded w-4/5" />
                      <div className="h-3 bg-cream-100 rounded w-full" />
                      <div className="h-3 bg-cream-100 rounded w-3/4" />
                    </div>
                    <div className="mt-4 h-8 bg-cream-100 rounded-lg w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!isComparing && results && (
              <div
                className={cn(
                  "grid gap-4",
                  results.length <= 1 ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
                )}
              >
                {results.map((result) => (
                  <ResultCard
                    key={result.model}
                    result={result}
                    isCopied={copiedModel === result.model}
                    isExpanded={expandedModels.has(result.model)}
                    showWinner={showWinner}
                    isSavingComparison={isSavingComparison}
                    hasComparisonId={comparisonId !== null}
                    isWinner={winnerModel === result.model}
                    isPicking={winnerPickingFor === result.model}
                    isSavingWinner={isSavingWinner}
                    currentWinnerReason={winnerModel === result.model ? winnerReason : null}
                    onCopy={() => handleCopy(result)}
                    onUse={() => handleUseOutput(result)}
                    onToggleExpand={() => toggleExpanded(result.model)}
                    onStartPick={() => setWinnerPickingFor(result.model)}
                    onCancelPick={() => setWinnerPickingFor(null)}
                    onMarkWinner={(reason) => handleMarkWinner(result, reason)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isComparing && !results && !compareError && (
              <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-10 h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                <FlaskConical className="size-10 text-ink-200 mb-4" />
                <p className="text-sm font-medium text-ink-600 mb-1">Ready to compare</p>
                <p className="text-sm text-ink-400 max-w-xs">
                  Enter an idea, pick your tool, select models, and click &ldquo;Generate comparison&rdquo;.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── History section ────────────────────────────────────────────── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-ink-700">Recent Comparisons</h2>
            {isLoadingHistory && <Loader2 className="size-3.5 animate-spin text-ink-400" />}
          </div>

          {history !== null && history.length === 0 && !isLoadingHistory && (
            <p className="text-sm text-ink-400">No comparisons yet. Run one above to start building the dataset.</p>
          )}

          {history !== null && history.length > 0 && (
            <div className="rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden">
              {history.map((item, i) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  isLast={i === history.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

// ─── Result card ───────────────────────────────────────────────────────────

function ResultCard({
  result,
  isCopied,
  isExpanded,
  showWinner,
  isSavingComparison,
  hasComparisonId,
  isWinner,
  isPicking,
  isSavingWinner,
  currentWinnerReason,
  onCopy,
  onUse,
  onToggleExpand,
  onStartPick,
  onCancelPick,
  onMarkWinner,
}: {
  result: ModelLabResult;
  isCopied: boolean;
  isExpanded: boolean;
  showWinner: boolean;
  isSavingComparison: boolean;
  hasComparisonId: boolean;
  isWinner: boolean;
  isPicking: boolean;
  isSavingWinner: boolean;
  currentWinnerReason: string | null;
  onCopy: () => void;
  onUse: () => void;
  onToggleExpand: () => void;
  onStartPick: () => void;
  onCancelPick: () => void;
  onMarkWinner: (reason: string) => void;
}) {
  const score = result.score?.overall ?? null;
  const PREVIEW_CHARS = 500;
  const isLong = (result.output?.length ?? 0) > PREVIEW_CHARS;
  const isKimiTimeout =
    (result.model.includes("kimi") || result.model.includes("moonshot")) &&
    (result.error?.includes("timed out") ?? false);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card card-soft flex flex-col overflow-hidden transition-colors",
        isWinner ? "border-clay-300/70" : "border-ink-100/70"
      )}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-ink-100/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              {isWinner && <Trophy className="size-3.5 text-clay-500" />}
              <div className="text-sm font-semibold text-ink-900">{result.displayName}</div>
            </div>
            <div className="text-[11px] text-ink-400 mt-0.5">
              {result.model.includes("moonshot") || result.model.includes("kimi")
                ? "via OpenRouter"
                : "Anthropic"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {score !== null && !result.error && <ScoreBadge score={score} />}
            <MetaBadge icon={<Clock className="size-3" />} label={`${result.latencyMs}ms`} />
            {result.estimatedCostUSD !== null && (
              <MetaBadge
                icon={<DollarSign className="size-3" />}
                label={`$${result.estimatedCostUSD.toFixed(4)}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1">
        {result.error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              {isKimiTimeout
                ? "Kimi timed out. Claude is recommended for production use."
                : result.error}
            </span>
          </div>
        ) : result.output ? (
          <>
            <p
              className={cn(
                "text-[13px] text-ink-700 leading-relaxed font-mono whitespace-pre-wrap",
                !isExpanded && "line-clamp-[12]"
              )}
            >
              {result.output}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="mt-2 flex items-center gap-1 text-[11px] text-clay-600 hover:text-clay-700 font-medium transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="size-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" />
                    Show full prompt
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 text-sm text-ink-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>No output returned.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {!result.error && result.output && (
        <div className="px-5 pb-4 space-y-2.5">
          {/* Copy + Use */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onCopy} className="flex-1">
              {isCopied ? (
                <>
                  <Check className="size-3.5 text-clay-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button size="sm" onClick={onUse} className="flex-1">
              Use this
              <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {/* Winner section — only when comparing 2+ models */}
          {showWinner && (
            <div className="border-t border-ink-100/50 pt-2.5">
              {isWinner ? (
                <div className="flex items-center gap-1.5 text-[12px] text-clay-600 font-medium">
                  <Trophy className="size-3.5" />
                  Winner{currentWinnerReason ? ` · ${currentWinnerReason}` : ""}
                </div>
              ) : isPicking ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-ink-400 font-medium">Pick a reason:</span>
                    <button
                      type="button"
                      onClick={onCancelPick}
                      className="text-ink-300 hover:text-ink-500 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {WINNER_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => onMarkWinner(reason)}
                        disabled={isSavingWinner}
                        className="text-[11px] text-ink-600 bg-cream-100 hover:bg-cream-200 border border-ink-100 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStartPick}
                  disabled={isSavingComparison || !hasComparisonId}
                  className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingComparison ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trophy className="size-3.5" />
                  )}
                  {isSavingComparison ? "Saving…" : "Mark as winner"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History row ───────────────────────────────────────────────────────────

function HistoryRow({
  item,
  isLast,
}: {
  item: ModelComparisonSummary;
  isLast: boolean;
}) {
  const modelNames = item.results.map((r) => r.shortName).join(", ");
  const winnerShortName = item.winner_model
    ? (item.results.find((r) => r.model === item.winner_model)?.shortName ?? item.winner_model)
    : null;
  const scoreText = item.results
    .map((r) => r.score !== null ? `${r.shortName}: ${r.score.overall}` : `${r.shortName}: failed`)
    .join("  ");

  return (
    <div
      className={cn(
        "px-5 py-3.5 flex items-start gap-4",
        !isLast && "border-b border-ink-100/60"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-800 truncate" title={item.idea}>
          {item.idea}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          <span className="text-[11px] text-ink-400">{item.target_tool}</span>
          <span className="text-[10px] text-ink-200">·</span>
          <span className="text-[11px] text-ink-400">{modelNames}</span>
          {winnerShortName && (
            <>
              <span className="text-[10px] text-ink-200">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-clay-600 font-medium">
                <Trophy className="size-3" />
                {winnerShortName}
                {item.winner_reason && ` · ${item.winner_reason}`}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right space-y-0.5">
        {scoreText && (
          <div className="text-[11px] font-mono text-ink-400">{scoreText}</div>
        )}
        <div className="text-[11px] text-ink-300">{formatRelativeDate(item.created_at)}</div>
      </div>
    </div>
  );
}

// ─── Badges ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
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

function MetaBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-400 bg-cream-100 rounded-full px-2 py-0.5">
      {icon}
      {label}
    </div>
  );
}

// ─── Retry-after helper ────────────────────────────────────────────────────

function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return "shortly";
  const totalMinutes = Math.ceil(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Date helper ───────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  const diffDays = diffHours / 24;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
  return d.toLocaleDateString();
}
