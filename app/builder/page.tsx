"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { Button } from "@/components/system/button";
import { ContextFields } from "@/components/builder/context-fields";
import { PromptSheet } from "@/components/builder/prompt-sheet";
import { ScoreMargin } from "@/components/builder/score-margin";
import { ResultActions } from "@/components/builder/result-actions";
import { LibraryPanel } from "@/components/builder/library-panel";
import { PackTypeSelector } from "@/components/builder/pack-type-selector";
import { PromptPackSheet } from "@/components/builder/prompt-pack-sheet";
import { UpgradeCta } from "@/components/billing/upgrade-cta";
import { PaywallDialog, dispatchPaywallOpen } from "@/components/billing/paywall-dialog";
import { usePromptUsage } from "@/hooks/usePromptUsage";
import { useIdeaSuggestions } from "@/hooks/useIdeaSuggestions";
import { track } from "@/lib/analytics";
import { TEMPLATES } from "@/lib/templates";
import { CHECKOUT_DRAFT_KEY, parseCheckoutDraft } from "@/lib/checkout-draft";
import {
  rememberVersion,
  nextStepIdea,
  shouldOfferUpgrade,
  promptFingerprint,
  type Refinement,
  type PromptVersion,
  type Playbook,
} from "@/lib/workspace";
import { inferTaskCategory, getSuggestions } from "@/lib/idea-suggestions";
import { canExpandIdea, editPromptText } from "@/lib/prompt-editing";
import { isTaskCategory, TASK_CATEGORIES, type TaskCategory } from "@/lib/task-categories";
import type { ToolId } from "@/lib/mock-data";
import type { PromptContext, PromptRecord, PromptScore } from "@/types/prompt";
import { generateTitleFromIdea } from "@/types/prompt";
import type { PackType, PromptPack, PromptPackRecord } from "@/types/prompt-pack";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "chatgpt", label: "ChatGPT" },
];

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  auto: "Auto",
  writing: "Writing",
  coding: "Coding",
  research: "Research",
  daily: "Everyday",
  business: "Business",
  creative: "Creative",
};

function BuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = searchParams.get("id");
  const templateId = searchParams.get("template");
  const packId = searchParams.get("pack");

  const [mode, setMode] = useState<"single" | "pack">(searchParams.get("mode") === "pack" ? "pack" : "single");
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolId>("claude");
  const [context, setContext] = useState<PromptContext>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [resultIdea, setResultIdea] = useState("");
  const [promptEdited, setPromptEdited] = useState(false);
  const manualEdit = useRef(false);
  const [score, setScore] = useState<PromptScore | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const savedFingerprint = useRef<string | null>(null);
  const generationLock = useRef(false);
  const initializedDraft = useRef(false);
  const generationController = useRef<AbortController | null>(null);
  const scoreController = useRef<AbortController | null>(null);

  const [savedPackId, setSavedPackId] = useState<string | null>(null);
  const [isPackSaved, setIsPackSaved] = useState(false);
  const [generateRequestId, setGenerateRequestId] = useState<string | null>(null);
  const [packRequestId, setPackRequestId] = useState<string | null>(null);
  const [packType, setPackType] = useState<PackType>("build_an_app");
  const [packResult, setPackResult] = useState<PromptPack | null>(null);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(Boolean(promptId || packId));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingPack, setIsSavingPack] = useState(false);
  const [isDeletingPack, setIsDeletingPack] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [questions, setQuestions] = useState<{ question: string; placeholder?: string }[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const { isPaid, remainingThisWeek, isLoading: usageLoading } = usePromptUsage();
  const { seed } = useIdeaSuggestions();

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  const hasCurrentResult = canExpandIdea(idea) && resultIdea === idea && Boolean(generatedPrompt.trim() || promptEdited);
  const category = isTaskCategory(context.category) ? context.category : "auto";

  useEffect(() => () => { generationController.current?.abort(); scoreController.current?.abort(); }, []);
  useEffect(() => { setOptimizeError(null); }, [idea, generatedPrompt]);

  useEffect(() => {
    if (searchParams.get("resume") !== "checkout" || promptId || packId) return;
    try {
      const draft = parseCheckoutDraft(sessionStorage.getItem(CHECKOUT_DRAFT_KEY));
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      if (draft) {
        setIdea(draft.idea);
        setContext(draft.context);
        setTool(draft.tool);
        setGeneratedPrompt(draft.prompt);
        setResultIdea(draft.idea);
        setSavedId(draft.savedId);
        setHasCopied(draft.copied);
        setIsSaved(draft.saved);
      }
    } catch {
      // Storage can be blocked.
    }
  }, [searchParams, promptId, packId]);

  useEffect(() => {
    if (initializedDraft.current) return;
    initializedDraft.current = true;
    track("builder_opened");
    if (promptId || templateId || packId || searchParams.get("resume") === "checkout") return;
    try {
      const draft = sessionStorage.getItem("ump:idea_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (typeof parsed.idea === "string") setIdea(parsed.idea.slice(0, 4000));
        if (parsed.context && typeof parsed.context === "object") setContext(parsed.context);
        sessionStorage.removeItem("ump:idea_draft");
      }
    } catch {
      // A malformed draft must not block the builder.
    }
  }, [promptId, templateId, packId, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("ump:lab_output");
    if (!raw) return;
    sessionStorage.removeItem("ump:lab_output");
    try {
      const parsed = JSON.parse(raw) as { idea?: string; tool?: ToolId; generatedPrompt?: string; score?: PromptScore | null };
      if (parsed.idea) setIdea(parsed.idea);
      if (parsed.tool === "claude" || parsed.tool === "cursor" || parsed.tool === "chatgpt") setTool(parsed.tool);
      if (parsed.generatedPrompt) {
        setGeneratedPrompt(parsed.generatedPrompt);
        setResultIdea(parsed.idea ?? "");
        setIsSaved(false);
        setScore(parsed.score ?? null);
      }
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  useEffect(() => {
    if (!promptId) return;
    setIsLoading(true);
    const controller = new AbortController();
    fetch(`/api/prompts/${promptId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(({ data, error }: { data?: PromptRecord; error?: string }) => {
        if (error || !data) {
          showToast("error", error ?? "Failed to load the prompt.");
          return;
        }
        setIdea(data.idea);
        setTool(data.target_tool);
        setContext(data.context ?? {});
        setGeneratedPrompt(data.generated_prompt);
        setResultIdea(data.idea);
        setScore(data.score);
        setSavedId(data.id);
        setIsSaved(true);
        savedFingerprint.current = promptFingerprint({ ...data, context: data.context ?? {} });
        track("prompt_reopened", { target_tool: data.target_tool });
      })
      .catch(() => { if (!controller.signal.aborted) showToast("error", "Failed to load the prompt."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [promptId]);

  useEffect(() => {
    if (!templateId || promptId) return;
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setIdea(template.idea);
    setTool(template.target_tool);
    if (template.context) setContext(template.context);
  }, [templateId, promptId]);

  useEffect(() => {
    if (!packId) return;
    setIsLoading(true);
    const controller = new AbortController();
    fetch(`/api/prompt-packs/${packId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(({ data, error }: { data?: PromptPackRecord; error?: string }) => {
        if (error || !data) {
          showToast("error", error ?? "Failed to load the pack.");
          return;
        }
        setMode("pack");
        setIdea(data.idea);
        setPackType(data.pack_type);
        setContext(data.context ?? {});
        setPackResult({ title: data.title, pack_type: data.pack_type, prompts: data.prompts });
        setSavedPackId(data.id);
        setIsPackSaved(true);
      })
      .catch(() => { if (!controller.signal.aborted) showToast("error", "Failed to load the pack."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [packId]);

  useEffect(() => {
    if (savedPackId) setIsPackSaved(false);
  }, [idea, packType, context, savedPackId]);

  useEffect(() => {
    if (savedId) setIsSaved(savedFingerprint.current === promptFingerprint({ idea, target_tool: tool, context, generated_prompt: generatedPrompt, score }));
  }, [idea, tool, context, generatedPrompt, score, savedId]);

  const runScoring = useCallback(async (prompt: string, options?: { signal?: AbortSignal; universal?: boolean }): Promise<PromptScore | null> => {
    setScoreError(null);
    setIsScoring(true);
    scoreController.current?.abort();
    const controller = new AbortController();
    scoreController.current = controller;
    if (options?.signal?.aborted) controller.abort();
    try {
      const response = await fetch("/api/prompts/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ generated_prompt: prompt, idea, target_tool: tool, universal: options?.universal ?? context.universal }),
      });
      if (controller.signal.aborted) return null;
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setScoreError(json.error ?? "Scoring failed. Try again.");
        return null;
      }
      const { data } = await response.json();
      setScore(data);
      track("prompt_scored", { target_tool: tool, score_overall: data.overall });
      return data;
    } catch {
      if (!controller.signal.aborted) setScoreError("Scoring failed. Check your connection and try again.");
      return null;
    } finally {
      if (scoreController.current === controller) {
        scoreController.current = null;
        setIsScoring(false);
      }
    }
  }, [idea, tool, context.universal]);

  const handleEditPrompt = useCallback((value: string) => {
    if (!hasCurrentResult || isLoading || isGenerating || isOptimizing || isSaving || (generationLock.current && !isScoring)) return;
    const next = editPromptText(generatedPrompt, value, context.versions, !manualEdit.current);
    if (!next.changed) return;
    manualEdit.current = true;
    scoreController.current?.abort();
    setGeneratedPrompt(next.prompt);
    setContext({ ...context, versions: next.versions });
    setPromptEdited(true);
    setScore(null);
    setScoreError(null);
    setIsSaved(false);
    setHasCopied(false);
    setSavedThisSession(false);
    setGenerateRequestId(null);
  }, [hasCurrentResult, generatedPrompt, context, isLoading, isGenerating, isOptimizing, isSaving, isScoring]);

  const handleOptimize = useCallback(async () => {
    if (!hasCurrentResult || !generatedPrompt.trim() || !score || generationLock.current || saveLock.current || isLoading || isGenerating || isScoring || isOptimizing || isSaving) return;
    generationLock.current = true;
    setIsOptimizing(true);
    setOptimizeError(null);
    const controller = new AbortController();
    generationController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch("/api/prompts/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ idea, target_tool: tool, context, generated_prompt: generatedPrompt, score, outputLanguage: "en" }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Optimization failed.");
      const improved = json.data?.improved_prompt;
      if (controller.signal.aborted || typeof improved !== "string" || !improved.trim()) throw new Error("Optimization returned no prompt.");
      setContext({ ...context, versions: rememberVersion(context.versions, generatedPrompt, "Optimization") });
      setGeneratedPrompt(improved);
      setPromptEdited(false);
      manualEdit.current = false;
      setScore(null);
      setScoreError(null);
      setIsSaved(false);
      setHasCopied(false);
      setSavedThisSession(false);
      setGenerateRequestId(null);
      track("prompt_optimized", { target_tool: tool });
      showToast("success", "Prompt optimized.");
      await runScoring(improved, { signal: controller.signal });
    } catch {
      setOptimizeError("Could not optimize the prompt. Try again.");
    } finally {
      window.clearTimeout(timeout);
      generationController.current = null;
      generationLock.current = false;
      setIsOptimizing(false);
    }
  }, [hasCurrentResult, generatedPrompt, score, isLoading, isGenerating, isScoring, isOptimizing, isSaving, idea, tool, context, runScoring]);

  const handleGeneratePack = useCallback(async () => {
    if (!idea.trim()) {
      showToast("error", "Add an idea first.");
      return;
    }
    if (isGeneratingPack) return;
    setIsGeneratingPack(true);
    setPackResult(null);
    setPackError(null);
    setPackRequestId(null);
    try {
      const response = await fetch("/api/prompt-packs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, pack_type: packType, context, outputLanguage: "en" }),
      });
      const json = await response.json();
      if (!response.ok) {
        if (json?.upgradeRequired) {
          dispatchPaywallOpen();
          window.dispatchEvent(new Event("prompt_usage_refresh"));
          return;
        }
        setPackError(json.error ?? "Pack generation failed. Try again.");
        return;
      }
      setPackResult(json.data);
      if (savedPackId) setIsPackSaved(false);
      const requestId = response.headers.get("X-Request-Id");
      if (requestId) setPackRequestId(requestId);
      track("prompt_pack_generated", { pack_type: packType });
      window.dispatchEvent(new Event("prompt_usage_refresh"));
    } catch {
      setPackError("Pack generation failed. Check your connection and try again.");
    } finally {
      setIsGeneratingPack(false);
    }
  }, [idea, packType, context, isGeneratingPack, savedPackId]);

  const handleGenerate = useCallback(async (nextContext?: PromptContext, refinement?: Refinement) => {
    if (!canExpandIdea(idea) && !refinement) {
      showToast("error", "Add a few words about what you want help with.");
      return;
    }
    if (generationLock.current || isGenerating || isScoring || isSaving) return;
    generationLock.current = true;
    const originalPrompt = generatedPrompt;
    const originalScore = score;
    const wasSaved = isSaved;
    const wasCopied = hasCopied;
    const wasSavedThisSession = savedThisSession;
    const previousRequestId = generateRequestId;
    let completed = false;
    const effectiveContext = nextContext ?? { ...context, universal: true, category: context.category ?? "auto" };
    setContext(effectiveContext);
    setIsGenerating(true);
    if (!refinement) {
      setGeneratedPrompt("");
      setScore(null);
    }
    setHasCopied(false);
    setSavedThisSession(false);
    setScoreError(null);
    setIsSaved(false);
    setGenerateRequestId(null);

    const controller = new AbortController();
    generationController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          idea,
          target_tool: tool,
          context: effectiveContext,
          outputLanguage: "en",
          refinement: refinement ? { action: refinement, prompt: originalPrompt } : undefined,
        }),
      });

      if (!response.ok) {
        try {
          const json = await response.json();
          if (json?.upgradeRequired) {
            dispatchPaywallOpen();
            window.dispatchEvent(new Event("prompt_usage_refresh"));
            return;
          }
          if (json?.error) {
            showToast("error", json.error);
            return;
          }
        } catch {
          // Fall through.
        }
        showToast("error", `Generation failed (HTTP ${response.status}).`);
        return;
      }

      if (!response.body) {
        showToast("error", "No response body from the generation endpoint.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setGeneratedPrompt(accumulated);
      }
      accumulated += decoder.decode();
      if (!accumulated.trim()) throw new Error("No prompt was returned. Please try again.");
      if (accumulated.length > 16000) throw new Error("The generated prompt is too long. Try a smaller task.");
      completed = true;
      setGeneratedPrompt(accumulated);
      setResultIdea(idea);
      setPromptEdited(false);
      manualEdit.current = false;
      setContext({ ...effectiveContext, versions: refinement ? rememberVersion(effectiveContext.versions, originalPrompt, refinement) : [] });
      setScore(null);
      if (refinement) track("prompt_refined", { action_type: refinement });
      const requestId = response.headers.get("X-Request-Id");
      if (requestId) setGenerateRequestId(requestId);
      setIsGenerating(false);
      track("prompt_generated", { target_tool: tool });
      window.dispatchEvent(new Event("prompt_usage_refresh"));
      await runScoring(accumulated, { universal: effectiveContext.universal, signal: controller.signal });
    } catch (error) {
      setGeneratedPrompt(originalPrompt);
      setScore(originalScore);
      setIsSaved(wasSaved);
      showToast("error", error instanceof Error ? error.message : "Generation failed.");
    } finally {
      if (!completed) {
        setGeneratedPrompt(originalPrompt);
        setScore(originalScore);
        setIsSaved(wasSaved);
        setHasCopied(wasCopied);
        setGenerateRequestId(previousRequestId);
        setSavedThisSession(wasSavedThisSession);
      }
      window.clearTimeout(timeout);
      generationLock.current = false;
      generationController.current = null;
      setIsGenerating(false);
    }
  }, [idea, tool, context, isGenerating, isScoring, isSaving, generatedPrompt, score, isSaved, hasCopied, savedThisSession, generateRequestId, runScoring]);

  async function prepareGenerate() {
    if (!canExpandIdea(idea) || checking || isGenerating) return;
    const universalContext: PromptContext = { ...context, universal: true, category };
    if (context.clarifications) {
      await handleGenerate(universalContext);
      return;
    }
    setChecking(true);
    setQuestions([]);
    setAnswers([]);
    try {
      const response = await fetch("/api/prompts/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, category, context, outputLanguage: "en" }),
      });
      const json = await response.json();
      if (json?.upgradeRequired) {
        dispatchPaywallOpen();
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Could not prepare the prompt.");
      const nextQuestions: { question: string; placeholder?: string }[] = json.data ?? [];
      if (nextQuestions.length) {
        setQuestions(nextQuestions);
        setAnswers(nextQuestions.map(() => ""));
      } else {
        await handleGenerate(universalContext);
      }
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not prepare the prompt.");
    } finally {
      setChecking(false);
    }
  }

  function submitAnswers() {
    const clarifications = questions
      .map((question, index) => `${question.question}\n${(answers[index] ?? "").trim()}`)
      .filter((item) => item.split("\n").slice(1).join("\n").trim())
      .join("\n\n");
    setQuestions([]);
    void handleGenerate({ ...context, universal: true, category, clarifications: clarifications || undefined });
  }

  const handleSave = useCallback(async () => {
    if (saveLock.current || generationLock.current || isGenerating || isScoring) return;
    if (!hasCurrentResult || !generatedPrompt.trim()) {
      showToast("error", "Generate a prompt first.");
      return;
    }
    saveLock.current = true;
    setIsSaving(true);
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
        const response = await fetch(`/api/prompts/${savedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Update failed.");
        savedFingerprint.current = promptFingerprint(body);
        setIsSaved(true);
        setSavedThisSession(true);
        showToast("success", "Prompt updated.");
        track("prompt_saved", { target_tool: tool, action_type: "update" });
      } else {
        const response = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, request_id: generateRequestId }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Save failed.");
        savedFingerprint.current = promptFingerprint(body);
        setSavedId(json.data.id);
        setIsSaved(true);
        setSavedThisSession(true);
        router.replace(`/builder?id=${json.data.id}`, { scroll: false });
        showToast("success", "Prompt saved.");
        track("prompt_saved", { target_tool: tool, action_type: "create" });
        window.dispatchEvent(new Event("prompt_usage_refresh"));
      }
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Save failed.");
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  }, [hasCurrentResult, idea, tool, context, generatedPrompt, score, savedId, router, generateRequestId, isGenerating, isScoring]);

  const startTask = useCallback((nextIdea: string, nextContext: PromptContext): boolean => {
    if (generationLock.current || isGenerating || isScoring || isSaving) return false;
    if (generatedPrompt && !isSaved && !window.confirm("Replace the current unsaved prompt?")) return false;
    setIdea(nextIdea);
    setContext(nextContext);
    setGeneratedPrompt("");
    setResultIdea("");
    setScore(null);
    setPromptEdited(false);
    manualEdit.current = false;
    savedFingerprint.current = null;
    setSavedId(null);
    setIsSaved(false);
    setHasCopied(false);
    setSavedThisSession(false);
    setGenerateRequestId(null);
    setScoreError(null);
    setIsLoading(false);
    router.replace("/builder", { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }, [generatedPrompt, isSaved, isGenerating, isScoring, isSaving, router]);

  const applyPlaybook = useCallback((playbook: Playbook) => startTask(playbook.idea, { ...playbook.context, universal: true }), [startTask]);

  function restoreVersion(version: PromptVersion) {
    if (generationLock.current || isGenerating || isScoring || isSaving) return;
    setContext({ ...context, versions: rememberVersion((context.versions ?? []).filter((item) => item !== version), generatedPrompt, "Restored version") });
    setGeneratedPrompt(version.prompt);
    setScore(null);
    setIsSaved(false);
    setHasCopied(false);
    setSavedThisSession(false);
    setGenerateRequestId(null);
    setPromptEdited(false);
    manualEdit.current = false;
    setScoreError(null);
    track("prompt_version_restored");
    showToast("success", "Version restored.");
  }

  const handleDelete = useCallback(() => {
    if (!savedId || generationLock.current || saveLock.current || isOptimizing || isSaving || isLoading || isGenerating || isScoring) return;
    if (!window.confirm("Delete this saved prompt?")) return;
    setIsDeleting(true);
    void (async () => {
      try {
        const response = await fetch(`/api/prompts/${savedId}`, { method: "DELETE" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Delete failed.");
        setIdea("");
        setGeneratedPrompt("");
        setPromptEdited(false);
        manualEdit.current = false;
        setScore(null);
        setSavedId(null);
        setIsSaved(false);
        router.replace("/builder", { scroll: false });
        showToast("success", "Prompt deleted.");
      } catch (error) {
        showToast("error", error instanceof Error ? error.message : "Delete failed.");
      } finally {
        setIsDeleting(false);
      }
    })();
  }, [savedId, router, isOptimizing, isSaving, isLoading, isGenerating, isScoring]);

  const handleSavePack = useCallback(() => {
    if (!idea.trim() || !packResult) {
      showToast("error", "Generate a pack first.");
      return;
    }
    setIsSavingPack(true);
    void (async () => {
      const body = {
        idea,
        pack_type: packType,
        context,
        prompts: packResult.prompts,
        title: generateTitleFromIdea(idea),
      };
      try {
        if (savedPackId) {
          const response = await fetch(`/api/prompt-packs/${savedPackId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error ?? "Update failed.");
          setIsPackSaved(true);
          showToast("success", "Pack updated.");
        } else {
          const response = await fetch("/api/prompt-packs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, request_id: packRequestId }),
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error ?? "Save failed.");
          setSavedPackId(json.data.id);
          setIsPackSaved(true);
          showToast("success", "Pack saved.");
          window.dispatchEvent(new Event("prompt_usage_refresh"));
        }
      } catch (error) {
        showToast("error", error instanceof Error ? error.message : "Save failed.");
      } finally {
        setIsSavingPack(false);
      }
    })();
  }, [idea, packType, context, packResult, savedPackId, packRequestId]);

  const handleDeletePack = useCallback(() => {
    if (!savedPackId) return;
    if (!window.confirm("Delete this saved pack?")) return;
    setIsDeletingPack(true);
    void (async () => {
      try {
        const response = await fetch(`/api/prompt-packs/${savedPackId}`, { method: "DELETE" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Delete failed.");
        setPackResult(null);
        setPackError(null);
        setSavedPackId(null);
        setIsPackSaved(false);
        router.replace("/builder", { scroll: false });
        showToast("success", "Pack deleted.");
      } catch (error) {
        showToast("error", error instanceof Error ? error.message : "Delete failed.");
      } finally {
        setIsDeletingPack(false);
      }
    })();
  }, [savedPackId, router]);

  const suggestions = getSuggestions(idea, category, seed, 4, "en");
  const title = idea.trim() ? generateTitleFromIdea(idea) : "Untitled prompt";
  const busy = isGenerating || isOptimizing || isScoring || isSaving || checking;

  return (
    <AppShell>
      <PaywallDialog />
      {toast ? (
        <div className={`toast ${toast.kind === "error" ? "toast--error" : ""}`} role="status">
          {toast.message}
        </div>
      ) : null}

      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / Builder</p>
          <h1 className="app-head__title">{mode === "pack" ? "Prompt packs" : "The builder"}</h1>
          <p className="app-head__sub">
            {mode === "pack"
              ? "Break a multi-step task into prompts that run in order."
              : "Write the rough version. The document on the right is the prompt Umprompt builds from it."}
          </p>
        </div>
        <div className="composer__actions">
          {mode === "single" ? (
            <>
              {savedId ? (
                <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isDeleting || busy}>
                  {isDeleting ? "Deleting" : "Delete"}
                </Button>
              ) : null}
              <Button size="sm" onClick={handleSave} disabled={isSaving || isLoading || busy || !hasCurrentResult || !generatedPrompt.trim()}>
                {isSaving ? "Saving" : isSaved ? "Saved" : savedId ? "Update" : "Save"}
              </Button>
            </>
          ) : (
            <>
              {savedPackId ? (
                <Button size="sm" variant="ghost" onClick={handleDeletePack} disabled={isDeletingPack || busy}>
                  {isDeletingPack ? "Deleting" : "Delete"}
                </Button>
              ) : null}
              <Button size="sm" onClick={handleSavePack} disabled={isSavingPack || isLoading || isGeneratingPack || !packResult}>
                {isSavingPack ? "Saving" : isPackSaved ? "Saved" : savedPackId ? "Update" : "Save pack"}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="tabs" style={{ marginBottom: 28 }}>
        <button type="button" aria-current={mode === "single" ? "page" : undefined} onClick={() => setMode("single")}>Single prompt</button>
        <button type="button" aria-current={mode === "pack" ? "page" : undefined} onClick={() => setMode("pack")}>Prompt pack {!isPaid ? "· Pro" : ""}</button>
      </div>

      {isLoading || (mode === "pack" && usageLoading) ? (
        <div className="sheet">
          <p className="body muted">Loading.</p>
        </div>
      ) : mode === "pack" && !isPaid ? (
        <section className="sheet">
          <h2 className="sheet__title">Prompt packs are a Pro feature.</h2>
          <p className="body" style={{ marginTop: 14 }}>
            A pack turns a multi-step task into a set of prompts that run in order. The single
            prompt builder stays free.
          </p>
          <div className="composer__actions" style={{ marginTop: 20 }}>
            <a href="/plan?returnTo=/builder?resume=checkout" className="button button--accent">See the plans</a>
          </div>
        </section>
      ) : mode === "pack" ? (
        <div className="builder">
          <section className="builder__composer">
            <div className="composer">
              <div className="field">
                <label className="field__label" htmlFor="pack-idea">The task</label>
                <textarea
                  id="pack-idea"
                  className="field__textarea"
                  rows={5}
                  value={idea}
                  onChange={(event) => setIdea(event.target.value.slice(0, 4000))}
                  placeholder="Build a usage dashboard for my SaaS. I need daily active users, monthly revenue, and churn, with charts."
                />
              </div>
              <ContextFields value={context} onChange={setContext} />
              <PackTypeSelector value={packType} onChange={setPackType} />
              <div className="composer__actions">
                <Button variant="accent" onClick={handleGeneratePack} disabled={!idea.trim() || isGeneratingPack}>
                  {isGeneratingPack ? "Writing the pack" : packResult ? "Generate again" : "Generate pack"}
                </Button>
                <span className="composer__hint">Uses one prompt</span>
              </div>
            </div>
          </section>
          <section className="builder__document">
            <PromptPackSheet pack={packResult} isGenerating={isGeneratingPack} error={packError} onCopied={() => track("prompt_pack_copied", { pack_type: packType })} />
          </section>
        </div>
      ) : (
        <div className="builder">
          <section className="builder__composer">
            <div className="composer">
              <div className="field">
                <label className="field__label" htmlFor="idea">What do you want to do?</label>
                <textarea
                  id="idea"
                  className="field__textarea"
                  rows={5}
                  value={idea}
                  onChange={(event) => setIdea(event.target.value.slice(0, 4000))}
                  placeholder="Write the rough version. For example: plan a two-week study schedule for a history exam, I lose focus after forty minutes."
                />
                <span className="field__hint">{idea.trim().length}/4000 · The rough version is fine.</span>
              </div>

              <div className="field">
                <span className="field__label">What kind of task?</span>
                <div className="composer__chips">
                  {TASK_CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="composer__chip"
                      aria-pressed={category === item}
                      onClick={() => setContext({ ...context, category: item, clarifications: undefined })}
                    >
                      {CATEGORY_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field__label">Target assistant</span>
                <div className="composer__chips">
                  {TOOLS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="composer__chip"
                      aria-pressed={tool === item.id}
                      onClick={() => setTool(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button type="button" className="composer__chip" aria-pressed={context.universal === true} onClick={() => setContext({ ...context, universal: !context.universal })}>
                    Portable
                  </button>
                </div>
              </div>

              <ContextFields value={context} onChange={setContext} />

              {questions.length ? (
                <div className="sheet sheet--surface" aria-live="polite">
                  <h2 className="sheet__title" style={{ fontSize: 24 }}>Two questions before the prompt.</h2>
                  <p className="small muted" style={{ marginTop: 8 }}>
                    Answer only what is useful. Empty answers are skipped.
                  </p>
                  <div className="stack" style={{ marginTop: 16 }}>
                    {questions.map((question, index) => (
                      <div className="field" key={`${question.question}-${index}`}>
                        <label className="field__label" htmlFor={`question-${index}`}>{question.question}</label>
                        <input
                          id={`question-${index}`}
                          className="field__input"
                          value={answers[index] ?? ""}
                          onChange={(event) => setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? event.target.value : answer))}
                          placeholder={question.placeholder ?? "Your answer"}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="composer__actions" style={{ marginTop: 16 }}>
                    <Button variant="accent" onClick={submitAnswers} disabled={isGenerating}>Generate prompt</Button>
                    <Button variant="ghost" onClick={() => { setQuestions([]); void handleGenerate({ ...context, universal: true, category }); }} disabled={isGenerating}>Skip</Button>
                  </div>
                </div>
              ) : null}

              {!generatedPrompt && suggestions.length ? (
                <div className="composer__suggestions">
                  <span className="field__label">Need a start?</span>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="composer__suggestion"
                      onClick={() => { setIdea(suggestion.idea); setContext({ ...context, category: suggestion.category, universal: true, clarifications: undefined }); }}
                    >
                      {suggestion.idea}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="composer__actions">
                <Button variant="accent" onClick={prepareGenerate} disabled={busy || !canExpandIdea(idea)}>
                  {checking ? "Reading the idea" : isGenerating ? "Writing the prompt" : hasCurrentResult ? "Generate again" : "Generate prompt"}
                </Button>
                <Button variant="ghost" onClick={() => { if (startTask("", { universal: true, category: "auto" })) setTimeout(() => document.getElementById("idea")?.focus(), 0); }} disabled={busy}>
                  New idea
                </Button>
                {!usageLoading ? <span className="composer__hint">{isPaid ? "Unlimited fair use" : `${remainingThisWeek ?? 7} free prompts left this week`}</span> : null}
              </div>
            </div>

            <LibraryPanel
              idea={idea}
              context={context}
              busy={busy}
              onPlaybook={applyPlaybook}
              onContextChange={setContext}
              playbookId={searchParams.get("playbook")}
              profileId={searchParams.get("profile")}
            />

            {shouldOfferUpgrade(isPaid, hasCopied || savedThisSession, remainingThisWeek) && !usageLoading && !isGenerating && !isScoring ? (
              <UpgradeCta returnTo="/builder?resume=checkout" />
            ) : null}
          </section>

          <section className="builder__document">
            <PromptSheet
              prompt={generatedPrompt}
              targetTool={tool}
              universal={context.universal}
              edited={promptEdited}
              isSaved={isSaved}
              isGenerating={isGenerating}
              isScoring={isScoring}
              busy={isLoading || isOptimizing || isSaving}
              onPromptChange={handleEditPrompt}
              onPromptEditEnd={() => { manualEdit.current = false; }}
              onCopied={() => { setHasCopied(true); track("prompt_copied", { target_tool: tool }); }}
              onRegenerate={() => void handleGenerate()}
            />

            <ScoreMargin
              score={score}
              isScoring={isScoring}
              error={scoreError}
              onRetry={() => { if (generatedPrompt) void runScoring(generatedPrompt); }}
              onOptimize={handleOptimize}
              isOptimizing={isOptimizing}
              optimizeDisabled={isLoading || isGenerating || isSaving || !hasCurrentResult || !generatedPrompt.trim()}
              optimizeError={optimizeError}
            />

            {hasCurrentResult && !isGenerating ? (
              <ResultActions
                busy={isOptimizing || isScoring || isSaving}
                canRefine={Boolean(generatedPrompt.trim())}
                category={category !== "auto" ? category : inferTaskCategory(idea, "en")}
                versions={context.versions}
                onRefine={(action) => void handleGenerate(undefined, action)}
                onRestore={restoreVersion}
                onNext={(instruction, index) => {
                  const { versions: _versions, clarifications: _answers, ...reusable } = context;
                  if (startTask(nextStepIdea(idea, instruction), reusable)) track("next_step_selected", { category, option: String(index) });
                }}
              />
            ) : null}

            <div className="small muted">{title}</div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<AppShell><div className="sheet"><p className="body muted">Loading the builder.</p></div></AppShell>}>
      <BuilderInner />
    </Suspense>
  );
}
