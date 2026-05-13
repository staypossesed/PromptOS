"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { IdeaInput } from "@/components/builder/idea-input";
import { ToolSelector } from "@/components/builder/tool-selector";
import { ContextPanel } from "@/components/builder/context-panel";
import { PromptOutput } from "@/components/builder/prompt-output";
import { ScorePanel } from "@/components/builder/score-panel";
import { PackTypeSelector } from "@/components/builder/pack-type-selector";
import { PromptPackOutput } from "@/components/builder/prompt-pack-output";
import { Button } from "@/components/ui/button";
import { Wand2, Save, Trash2, Loader2, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXAMPLE_IDEAS, type ToolId } from "@/lib/mock-data";
import type { PromptRecord } from "@/types/prompt";
import type { PromptContext } from "@/types/prompt";
import { generateTitleFromIdea } from "@/types/prompt";
import type { PackType, PromptPack, PromptPackRecord } from "@/types/prompt-pack";
import { Suspense } from "react";
import { track } from "@/lib/analytics";
import { TEMPLATES } from "@/lib/templates";
import { OnboardingPanel } from "@/components/builder/onboarding-panel";

// ─── Inner component (uses useSearchParams → needs Suspense) ───────────────

function BuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = searchParams.get("id");
  const templateId = searchParams.get("template");
  const packId = searchParams.get("pack");

  // ── Mode ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"single" | "pack">("single");

  // ── Core builder state ──────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolId>("claude");
  const [context, setContext] = useState<PromptContext>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [score, setScore] = useState<import("@/types/prompt").PromptScore | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // ── Pack save state ─────────────────────────────────────────────────────
  const [savedPackId, setSavedPackId] = useState<string | null>(null);
  const [isPackSaved, setIsPackSaved] = useState(false);

  // ── Pack state ──────────────────────────────────────────────────────────
  const [packType, setPackType] = useState<PackType>("build_an_app");
  const [packResult, setPackResult] = useState<PromptPack | null>(null);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  // ── Tab state (mobile) ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"prompt" | "score">("prompt");

  // ── Async operation states ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSavingPack, startSavingPackTransition] = useTransition();
  const [isDeletingPack, startDeletingPackTransition] = useTransition();

  // ── Toast feedback ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Analytics: builder_opened (fires once on mount) ─────────────────────
  useEffect(() => {
    track("builder_opened");
  }, []);

  // ── Prefill from Model Lab "Use this output" ──────────────────────────────
  // Reads sessionStorage once on mount. Runs before other load effects so that
  // promptId / packId effects (which run on their own deps) can override if needed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("ump:lab_output");
    if (!raw) return;
    sessionStorage.removeItem("ump:lab_output");
    try {
      const { idea: i, tool: t, generatedPrompt: p } = JSON.parse(raw) as {
        idea?: string;
        tool?: ToolId;
        generatedPrompt?: string;
      };
      if (i) setIdea(i);
      if (t && (t === "claude" || t === "cursor" || t === "chatgpt")) setTool(t);
      if (p) setGeneratedPrompt(p);
    } catch {
      // malformed storage — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load existing prompt when ?id= is present ───────────────────────────
  useEffect(() => {
    if (!promptId) return;

    setIsLoading(true);
    fetch(`/api/prompts/${promptId}`)
      .then((r) => r.json())
      .then(({ data, error }: { data?: PromptRecord; error?: string }) => {
        if (error || !data) {
          showToast("error", error ?? "Failed to load prompt.");
          return;
        }
        setIdea(data.idea);
        setTool(data.target_tool);
        setContext(data.context ?? {});
        setGeneratedPrompt(data.generated_prompt);
        setScore(data.score);
        setSavedId(data.id);
        setIsSaved(true);
        track("prompt_reopened", { target_tool: data.target_tool });
      })
      .catch(() => showToast("error", "Failed to load prompt."))
      .finally(() => setIsLoading(false));
  }, [promptId]);

  // ── Prefill from ?template= param (only when not loading an existing prompt)
  useEffect(() => {
    if (!templateId || promptId) return;
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setIdea(template.idea);
    setTool(template.target_tool);
    if (template.context) setContext(template.context);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // ── Load existing pack when ?pack= is present ─────────────────────────────
  useEffect(() => {
    if (!packId) return;
    const controller = new AbortController();
    setIsLoading(true);
    fetch(`/api/prompt-packs/${packId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(({ data, error }: { data?: PromptPackRecord; error?: string }) => {
        if (error || !data) {
          showToast("error", error ?? "Failed to load pack.");
          return;
        }
        setMode("pack");
        setIdea(data.idea);
        setPackType(data.pack_type);
        setContext(data.context ?? {});
        setPackResult({ title: data.title, pack_type: data.pack_type, prompts: data.prompts });
        setSavedPackId(data.id);
        setIsPackSaved(true);
        track("prompt_pack_reopened", { pack_type: data.pack_type });
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        showToast("error", "Failed to load pack.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  // ── Mark pack as "unsaved" whenever the user edits after loading ──────────
  useEffect(() => {
    if (savedPackId) setIsPackSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, packType, context]);

  // ── Mark as "unsaved" whenever the user edits after loading ─────────────
  useEffect(() => {
    if (savedId) setIsSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, tool, context, generatedPrompt]);

  // ── Score helper (shared by generate flow, manual retry, and optimize) ─────
  const runScoring = useCallback(async (
    prompt: string
  ): Promise<import("@/types/prompt").PromptScore | null> => {
    setScoreError(null);
    setIsScoring(true);
    setActiveTab("score");
    try {
      const res = await fetch("/api/prompts/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generated_prompt: prompt, idea, target_tool: tool }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setScore(data);
        track("prompt_scored", { target_tool: tool, score_overall: data.overall });
        return data;
      } else {
        const json = await res.json().catch(() => ({}));
        setScoreError(json.error ?? "Scoring failed. Try again.");
        return null;
      }
    } catch {
      setScoreError("Scoring failed. Check your connection and try again.");
      return null;
    } finally {
      setIsScoring(false);
    }
  }, [idea, tool]);

  // ── Manual retry (called from ScorePanel error state) ────────────────────
  const handleRetryScore = useCallback(() => {
    if (!generatedPrompt || isScoring || isGenerating) return;
    runScoring(generatedPrompt);
  }, [generatedPrompt, isScoring, isGenerating, runScoring]);

  // ── Optimize weak dimensions ─────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (!generatedPrompt || !score || isOptimizing || isGenerating || isScoring) return;

    const prevOverall = score.overall;
    setIsOptimizing(true);  // stays true through optimize + re-score
    setOptimizeError(null);
    setIsSaved(false);

    try {
      const res = await fetch("/api/prompts/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          target_tool: tool,
          context,
          generated_prompt: generatedPrompt,
          score,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOptimizeError(json.error ?? "Optimization failed. Try again.");
        return;
      }
      const improved: string = json.data?.improved_prompt;
      if (!improved) {
        setOptimizeError("Optimization returned an empty prompt.");
        return;
      }
      setGeneratedPrompt(improved);
      // isOptimizing stays true during re-scoring so the button stays locked
      const newScore = await runScoring(improved);
      // Before/after toast
      if (newScore) {
        if (newScore.overall > prevOverall) {
          showToast("success", `Optimized: ${prevOverall} → ${newScore.overall}`);
        } else {
          showToast("success", "Optimized — review the changes.");
        }
        track("prompt_optimized", { target_tool: tool, score_overall: newScore.overall });
      }
    } catch {
      setOptimizeError("Optimization failed. Check your connection and try again.");
    } finally {
      setIsOptimizing(false);
    }
  }, [generatedPrompt, score, idea, tool, context, isOptimizing, isGenerating, isScoring, runScoring]);

  // ── Generate Pack ────────────────────────────────────────────────────────
  const handleGeneratePack = useCallback(async () => {
    if (!idea.trim()) {
      showToast("error", "Add your idea first.");
      return;
    }
    if (isGeneratingPack) return;

    setIsGeneratingPack(true);
    setPackResult(null);
    setPackError(null);

    try {
      const res = await fetch("/api/prompt-packs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, pack_type: packType, context }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPackError(json.error ?? "Pack generation failed. Try again.");
        return;
      }
      setPackResult(json.data);
      if (savedPackId) setIsPackSaved(false);
      track("prompt_pack_generated", { pack_type: packType });
    } catch (err) {
      console.error("[handleGeneratePack]", err);
      setPackError("Pack generation failed. Check your connection and try again.");
    } finally {
      setIsGeneratingPack(false);
    }
  }, [idea, packType, context, isGeneratingPack, savedPackId]);

  // ── Generate (real AI streaming via /api/prompts/generate) ──────────────
  const handleGenerate = useCallback(async () => {
    if (!idea.trim()) {
      showToast("error", "Add your idea first.");
      return;
    }
    if (isGenerating || isScoring) return;

    setIsGenerating(true);
    setGeneratedPrompt("");
    setScore(null);
    setScoreError(null);
    setIsSaved(false);
    setActiveTab("prompt");

    try {
      const res = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, target_tool: tool, context }),
      });

      if (!res.ok) {
        let errMsg = `Generation failed (HTTP ${res.status}).`;
        try {
          const j = await res.json();
          if (j?.error) errMsg = j.error;
        } catch { /* use generic message */ }
        showToast("error", errMsg);
        return;
      }

      if (!res.body) {
        showToast("error", "No response body from generation endpoint.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setGeneratedPrompt(accumulated);
      }

      // Generation done — hand off to scoring (separate phase)
      setIsGenerating(false);
      track("prompt_generated", { target_tool: tool });
      await runScoring(accumulated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      showToast("error", message);
    } finally {
      setIsGenerating(false); // safety reset if streaming itself threw
    }
  }, [idea, tool, context, isGenerating, isScoring, runScoring]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!idea.trim() || !generatedPrompt.trim()) {
      showToast("error", "Generate a prompt before saving.");
      return;
    }

    startSaveTransition(async () => {
      const body = {
        idea,
        target_tool: tool,
        context,
        generated_prompt: generatedPrompt,
        score,
        title: generateTitleFromIdea(idea),
      };

      try {
        if (savedId) {
          // Update existing record
          const res = await fetch(`/api/prompts/${savedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Update failed.");
          setIsSaved(true);
          showToast("success", "Prompt updated.");
          track("prompt_saved", { target_tool: tool, action_type: "update" });
        } else {
          // Create new record
          const res = await fetch("/api/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Save failed.");
          setSavedId(json.data.id);
          setIsSaved(true);
          // Update URL without a full navigation so the page knows its ID
          router.replace(`/builder?id=${json.data.id}`, { scroll: false });
          showToast("success", "Prompt saved.");
          track("prompt_saved", { target_tool: tool, action_type: "create" });
        }
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Save failed.");
      }
    });
  }, [idea, tool, context, generatedPrompt, score, savedId, router]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (!savedId) return;
    if (!window.confirm("Delete this prompt? This cannot be undone.")) return;

    startDeleteTransition(async () => {
      try {
        const res = await fetch(`/api/prompts/${savedId}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Delete failed.");
        // Reset to a fresh builder
        setIdea("");
        setTool("claude");
        setGeneratedPrompt("");
        setScore(null);
        setSavedId(null);
        setIsSaved(false);
        router.replace("/builder", { scroll: false });
        showToast("success", "Prompt deleted.");
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }, [savedId, router]);

  // ── Save Pack ─────────────────────────────────────────────────────────────
  const handleSavePack = useCallback(() => {
    if (!idea.trim() || !packResult) {
      showToast("error", "Generate a pack before saving.");
      return;
    }

    startSavingPackTransition(async () => {
      const body = {
        idea,
        pack_type: packType,
        context,
        prompts: packResult.prompts,
        title: generateTitleFromIdea(idea),
      };

      try {
        if (savedPackId) {
          const res = await fetch(`/api/prompt-packs/${savedPackId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Update failed.");
          setIsPackSaved(true);
          showToast("success", "Pack updated.");
          track("prompt_pack_saved", { pack_type: packType, action_type: "update" });
        } else {
          const res = await fetch("/api/prompt-packs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Save failed.");
          setSavedPackId(json.data.id);
          setIsPackSaved(true);
          showToast("success", "Pack saved.");
          track("prompt_pack_saved", { pack_type: packType, action_type: "create" });
        }
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Save failed.");
      }
    });
  }, [idea, packType, context, packResult, savedPackId]);

  // ── Delete Pack ───────────────────────────────────────────────────────────
  const handleDeletePack = useCallback(() => {
    if (!savedPackId) return;
    if (!window.confirm("Delete this pack? This cannot be undone.")) return;

    startDeletingPackTransition(async () => {
      try {
        const res = await fetch(`/api/prompt-packs/${savedPackId}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Delete failed.");
        setPackResult(null);
        setPackError(null);
        setSavedPackId(null);
        setIsPackSaved(false);
        setIsLoading(false);
        router.replace("/builder", { scroll: false });
        showToast("success", "Pack deleted.");
        track("prompt_pack_deleted", { pack_type: packType });
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }, [savedPackId, packType, router]);

  // ── Title for breadcrumb ──────────────────────────────────────────────────
  const breadcrumbTitle = idea.trim()
    ? generateTitleFromIdea(idea)
    : "Untitled prompt";

  return (
    <AppShell>
      <Topbar
        breadcrumb={[
          { label: "Workspace" },
          { label: "Builder" },
          { label: breadcrumbTitle },
        ]}
        actions={
          <div className="hidden md:flex items-center gap-2">
            {mode === "pack" ? (
              <>
                {savedPackId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePack}
                    disabled={isDeletingPack}
                    className="text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    {isDeletingPack ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSavePack}
                  disabled={isSavingPack || isLoading || isGeneratingPack || !packResult}
                >
                  {isSavingPack ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {isPackSaved ? "Saved" : savedPackId ? "Update pack" : "Save pack"}
                </Button>
              </>
            ) : (
              <>
                {savedId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || isLoading || isGenerating || isScoring || isOptimizing || !generatedPrompt}
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {isSaved ? "Saved" : savedId ? "Update" : "Save draft"}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Toast notification */}
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
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-ink-900 leading-tight">
              {mode === "pack" ? "Prompt Pack" : savedId ? "Edit prompt" : "New prompt"}
            </h1>
            <p className="text-sm text-ink-400 mt-1">
              {mode === "pack"
                ? "Generate 5 coordinated prompts that execute a complete project end to end."
                : "Describe what you want — pick your tool — get an execution-ready prompt."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex p-1 bg-cream-100 rounded-full border border-ink-100/60 shrink-0">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all",
                mode === "single" ? "bg-white text-ink-900 card-soft" : "text-ink-500 hover:text-ink-700"
              )}
            >
              <Wand2 className="size-3.5" />
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode("pack")}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all",
                mode === "pack" ? "bg-white text-ink-900 card-soft" : "text-ink-500 hover:text-ink-700"
              )}
            >
              <Layers className="size-3.5" />
              Pack
            </button>
          </div>
        </div>

        {!isLoading && !promptId && !templateId && !idea && mode === "single" && (
          <OnboardingPanel
            onSelect={(newIdea, newTool, newContext) => {
              setIdea(newIdea);
              setTool(newTool);
              setContext(newContext);
            }}
          />
        )}

        {isLoading ? (
          <BuilderSkeleton />
        ) : mode === "pack" ? (
          /* ── Pack mode layout ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-5">
              <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-5 space-y-5">
                <IdeaInput value={idea} onChange={setIdea} />
                <ContextPanel value={context} onChange={setContext} />
                <PackTypeSelector value={packType} onChange={setPackType} />
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleGeneratePack}
                disabled={!idea.trim() || isGeneratingPack}
              >
                {isGeneratingPack ? (
                  <><Loader2 className="size-4 animate-spin" />Generating pack…</>
                ) : (
                  <><Layers className="size-4" />{packResult ? "Regenerate pack" : "Generate pack"}</>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full md:hidden"
                onClick={handleSavePack}
                disabled={isSavingPack || isGeneratingPack || !packResult}
              >
                {isSavingPack ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isPackSaved ? "Saved" : savedPackId ? "Update pack" : "Save pack"}
              </Button>
            </div>
            <div className="lg:col-span-8">
              <PromptPackOutput pack={packResult} isGenerating={isGeneratingPack} error={packError} />
            </div>
          </div>
        ) : (
          /* ── Single mode layout ───────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: input column */}
            <div className="lg:col-span-4 space-y-5">
              <div className="rounded-2xl border border-ink-100/70 bg-white card-soft p-5 space-y-5">
                <IdeaInput value={idea} onChange={setIdea} />

                {/* Example chips */}
                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                    Try an example
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_IDEAS.map((example) => (
                      <button
                        key={example}
                        onClick={() => setIdea(example)}
                        className="text-[11px] text-ink-600 bg-cream-100 hover:bg-cream-200 border border-ink-100 rounded-full px-2.5 py-1 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <ToolSelector value={tool} onChange={setTool} />
                <ContextPanel value={context} onChange={setContext} />
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleGenerate}
                disabled={!idea.trim() || isGenerating || isScoring || isOptimizing}
              >
                {isGenerating ? (
                  <><Loader2 className="size-4 animate-spin" />Generating…</>
                ) : isScoring ? (
                  <><Loader2 className="size-4 animate-spin" />Scoring…</>
                ) : isOptimizing ? (
                  <><Loader2 className="size-4 animate-spin" />Optimizing…</>
                ) : (
                  <><Wand2 className="size-4" />{generatedPrompt ? "Regenerate" : "Generate prompt"}</>
                )}
              </Button>

              {/* Mobile save button */}
              <Button
                size="lg"
                variant="outline"
                className="w-full md:hidden"
                onClick={handleSave}
                disabled={isSaving || isGenerating || isScoring || isOptimizing || !generatedPrompt}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSaved ? "Saved" : savedId ? "Update" : "Save draft"}
              </Button>
            </div>

            {/* Mobile: tab switcher */}
            <div className="lg:hidden">
              <div className="flex p-1 bg-cream-100 rounded-full mb-4 border border-ink-100/60">
                <TabButton active={activeTab === "prompt"} onClick={() => setActiveTab("prompt")}>
                  Prompt
                </TabButton>
                <TabButton active={activeTab === "score"} onClick={() => setActiveTab("score")}>
                  Score{score ? ` · ${score.overall}` : ""}
                </TabButton>
              </div>
              <div className="h-[600px]">
                {activeTab === "prompt" ? (
                  <PromptOutput
                    prompt={generatedPrompt}
                    targetTool={tool}
                    isSaved={isSaved}
                    isGenerating={isGenerating}
                    isOptimizing={isOptimizing}
                    onRegenerate={handleGenerate}
                  />
                ) : (
                  <ScorePanel score={score} isScoring={isScoring} error={scoreError} onRetry={handleRetryScore} onOptimize={handleOptimize} isOptimizing={isOptimizing} optimizeError={optimizeError} />
                )}
              </div>
            </div>

            {/* Desktop: two columns */}
            <div className="hidden lg:block lg:col-span-5 h-[calc(100vh-13rem)] sticky top-24">
              <PromptOutput
                prompt={generatedPrompt}
                targetTool={tool}
                isSaved={isSaved}
                isGenerating={isGenerating}
                isOptimizing={isOptimizing}
                onRegenerate={handleGenerate}
              />
            </div>
            <div className="hidden lg:block lg:col-span-3 h-[calc(100vh-13rem)] sticky top-24">
              <ScorePanel score={score} isScoring={isScoring} error={scoreError} onRetry={handleRetryScore} onOptimize={handleOptimize} isOptimizing={isOptimizing} optimizeError={optimizeError} />
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

function BuilderSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-pulse">
      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-cream-100 h-96" />
      </div>
      <div className="hidden lg:block lg:col-span-5">
        <div className="rounded-2xl bg-cream-100 h-[calc(100vh-13rem)]" />
      </div>
      <div className="hidden lg:block lg:col-span-3">
        <div className="rounded-2xl bg-cream-100 h-[calc(100vh-13rem)]" />
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 text-sm font-medium py-2 rounded-full transition-all",
        active ? "bg-white text-ink-900 card-soft" : "text-ink-500 hover:text-ink-700"
      )}
    >
      {children}
    </button>
  );
}

// ─── Page export: wraps inner in Suspense for useSearchParams ──────────────

export default function BuilderPage() {
  return (
    <Suspense fallback={<BuilderFallback />}>
      <BuilderInner />
    </Suspense>
  );
}

function BuilderFallback() {
  return (
    <AppShell>
      <div className="h-16 border-b border-ink-100/70 bg-cream-50/85" />
      <main className="flex-1 px-4 md:px-8 lg:px-10 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-pulse">
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-cream-100 h-96" />
          </div>
          <div className="hidden lg:block lg:col-span-5">
            <div className="rounded-2xl bg-cream-100 h-[calc(100vh-13rem)]" />
          </div>
          <div className="hidden lg:block lg:col-span-3">
            <div className="rounded-2xl bg-cream-100 h-[calc(100vh-13rem)]" />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
