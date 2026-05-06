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
import { Button } from "@/components/ui/button";
import { Wand2, Save, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXAMPLE_IDEAS, type ToolId } from "@/lib/mock-data";
import type { PromptRecord } from "@/types/prompt";
import type { PromptContext } from "@/types/prompt";
import { generateTitleFromIdea } from "@/types/prompt";
import { Suspense } from "react";

// ─── Inner component (uses useSearchParams → needs Suspense) ───────────────

function BuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = searchParams.get("id");

  // ── Core builder state ──────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolId>("claude");
  const [context, setContext] = useState<PromptContext>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [score, setScore] = useState<import("@/types/prompt").PromptScore | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // ── Tab state (mobile) ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"prompt" | "score">("prompt");

  // ── Async operation states ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // ── Toast feedback ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3000);
  }

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
      })
      .catch(() => showToast("error", "Failed to load prompt."))
      .finally(() => setIsLoading(false));
  }, [promptId]);

  // ── Mark as "unsaved" whenever the user edits after loading ─────────────
  useEffect(() => {
    if (savedId) setIsSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, tool, context, generatedPrompt]);

  // ── Score helper (shared by generate flow and manual retry) ──────────────
  const runScoring = useCallback(async (prompt: string) => {
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
      } else {
        const json = await res.json().catch(() => ({}));
        setScoreError(json.error ?? "Scoring failed. Try again.");
      }
    } catch {
      setScoreError("Scoring failed. Check your connection and try again.");
    } finally {
      setIsScoring(false);
    }
  }, [idea, tool]);

  // ── Manual retry (called from ScorePanel error state) ────────────────────
  const handleRetryScore = useCallback(() => {
    if (!generatedPrompt || isScoring || isGenerating) return;
    runScoring(generatedPrompt);
  }, [generatedPrompt, isScoring, isGenerating, runScoring]);

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
              disabled={isSaving || isLoading || isGenerating || isScoring || !generatedPrompt}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {isSaved ? "Saved" : savedId ? "Update" : "Save draft"}
            </Button>
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
        <div className="mb-6">
          <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-ink-900 leading-tight">
            {savedId ? "Edit prompt" : "New prompt"}
          </h1>
          <p className="text-sm text-ink-400 mt-1">
            Describe what you want — pick your tool — get an execution-ready prompt.
          </p>
        </div>

        {isLoading ? (
          <BuilderSkeleton />
        ) : (
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
                disabled={!idea.trim() || isGenerating || isScoring}
              >
                {isGenerating ? (
                  <><Loader2 className="size-4 animate-spin" />Generating…</>
                ) : isScoring ? (
                  <><Loader2 className="size-4 animate-spin" />Scoring…</>
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
                disabled={isSaving || isGenerating || isScoring || !generatedPrompt}
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
                    onRegenerate={handleGenerate}
                  />
                ) : (
                  <ScorePanel score={score} isScoring={isScoring} error={scoreError} onRetry={handleRetryScore} />
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
                onRegenerate={handleGenerate}
              />
            </div>
            <div className="hidden lg:block lg:col-span-3 h-[calc(100vh-13rem)] sticky top-24">
              <ScorePanel score={score} isScoring={isScoring} error={scoreError} onRetry={handleRetryScore} />
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
