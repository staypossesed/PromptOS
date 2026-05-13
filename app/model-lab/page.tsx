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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { ToolId } from "@/lib/mock-data";
import type { PromptScore } from "@/types/prompt";

// ─── Selectable models ────────────────────────────────────────────────────
// IDs must match MODEL_REGISTRY keys in lib/ai/providers.ts

const LAB_MODELS = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    costHint: "$3 / $15 per MTok",
    defaultChecked: true,
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    costHint: "$1 / $5 per MTok",
    defaultChecked: false,
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    provider: "OpenRouter",
    costHint: "$0.74 / $3.49 per MTok",
    defaultChecked: true,
  },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────

interface ModelLabResult {
  model: string;
  displayName: string;
  shortName: string;
  output: string | null;
  score: PromptScore | null;
  latencyMs: number;
  estimatedCostUSD: number | null;
  error: string | null;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ModelLabPage() {
  const router = useRouter();

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
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    track("model_lab_opened");
  }, []);

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3000);
  }

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCompare = useCallback(async () => {
    if (!idea.trim() || selectedModels.length === 0 || isComparing) return;

    setIsComparing(true);
    setResults(null);
    setCompareError(null);
    setExpandedModels(new Set());

    try {
      const res = await fetch("/api/model-lab/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, target_tool: tool, models: selectedModels }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Comparison failed.");
      setResults(json.data);

      const shortNames = (json.data as ModelLabResult[])
        .map((r: ModelLabResult) => r.shortName)
        .join(",");
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
  }, [idea, tool, selectedModels, isComparing]);

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

  const handleUseOutput = useCallback(
    (result: ModelLabResult) => {
      if (!result.output) return;
      sessionStorage.setItem(
        "ump:lab_output",
        JSON.stringify({ idea, tool, generatedPrompt: result.output })
      );
      track("model_output_used", {
        selected_model: result.shortName,
        score_overall: result.score?.overall,
      });
      router.push("/builder");
    },
    [idea, tool, router]
  );

  const toggleExpanded = (modelId: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      next.has(modelId) ? next.delete(modelId) : next.add(modelId);
      return next;
    });
  };

  const canCompare = idea.trim().length > 0 && selectedModels.length > 0;

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
              ? "border-clay-200/60 bg-white text-ink-800"
              : "border-destructive/20 bg-white text-destructive"
          )}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="size-4 text-clay-500 shrink-0" />
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── Left: input panel ──────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-5 space-y-5">
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
                          <div className="text-sm font-medium text-ink-800">{m.label}</div>
                          <div className="text-[11px] text-ink-400 mt-0.5">
                            {m.provider} · {m.costHint}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                  selectedModels.length === 1
                    ? "grid-cols-1"
                    : selectedModels.length === 2
                    ? "grid-cols-1 xl:grid-cols-2"
                    : "grid-cols-1 xl:grid-cols-2"
                )}
              >
                {selectedModels.map((id) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-ink-100/70 bg-white card-soft p-5 animate-pulse"
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
                  results.length === 1
                    ? "grid-cols-1"
                    : results.length === 2
                    ? "grid-cols-1 xl:grid-cols-2"
                    : "grid-cols-1 xl:grid-cols-2"
                )}
              >
                {results.map((result) => (
                  <ResultCard
                    key={result.model}
                    result={result}
                    isCopied={copiedModel === result.model}
                    isExpanded={expandedModels.has(result.model)}
                    onCopy={() => handleCopy(result)}
                    onUse={() => handleUseOutput(result)}
                    onToggleExpand={() => toggleExpanded(result.model)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isComparing && !results && !compareError && (
              <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-10 h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                <FlaskConical className="size-10 text-ink-200 mb-4" />
                <p className="text-sm font-medium text-ink-600 mb-1">Ready to compare</p>
                <p className="text-sm text-ink-400 max-w-xs">
                  Enter an idea, pick your tool, select models, and click &ldquo;Generate comparison&rdquo;.
                </p>
              </div>
            )}
          </div>
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
  onCopy,
  onUse,
  onToggleExpand,
}: {
  result: ModelLabResult;
  isCopied: boolean;
  isExpanded: boolean;
  onCopy: () => void;
  onUse: () => void;
  onToggleExpand: () => void;
}) {
  const score = result.score?.overall ?? null;
  const PREVIEW_CHARS = 500;
  const isLong = (result.output?.length ?? 0) > PREVIEW_CHARS;

  return (
    <div className="rounded-2xl border border-ink-100/70 bg-white card-soft flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-ink-100/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-ink-900">{result.displayName}</div>
            <div className="text-[11px] text-ink-400 mt-0.5">
              {result.model.includes("moonshot") || result.model.includes("kimi")
                ? "via OpenRouter"
                : "Anthropic"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {score !== null && <ScoreBadge score={score} />}
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
            <span>{result.error}</span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Footer */}
      {!result.error && result.output && (
        <div className="px-5 pb-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="flex-1"
          >
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
      )}
    </div>
  );
}

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
