"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ActionIcon } from "@/components/ui/action-icon";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Topbar } from "@/components/layout/topbar";
import { IdeaInput } from "@/components/builder/idea-input";
import { IdeaComposer } from "@/components/builder/idea-composer";
import { composerCopy } from "@/lib/composer-copy";
import { ContextPanel } from "@/components/builder/context-panel";
import { PromptOutput } from "@/components/builder/prompt-output";
import { ScorePanel } from "@/components/builder/score-panel";
import { PackTypeSelector } from "@/components/builder/pack-type-selector";
import { PromptPackOutput } from "@/components/builder/prompt-pack-output";
import { Button } from "@/components/ui/button";
import { Wand2, Save, Trash2, Loader2, CheckCircle2, AlertCircle, Layers, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ToolId } from "@/lib/mock-data";
import type { PromptRecord } from "@/types/prompt";
import type { PromptContext } from "@/types/prompt";
import { generateTitleFromIdea } from "@/types/prompt";
import type { PackType, PromptPack, PromptPackRecord } from "@/types/prompt-pack";
import { Suspense } from "react";
import { track } from "@/lib/analytics";
import { dispatchPaywallOpen } from "@/components/billing/paywall-modal";
import { TEMPLATES } from "@/lib/templates";
import { PacksUpsell } from "@/components/builder/packs-upsell";
import { UpgradeCTA } from "@/components/billing/upgrade-cta";
import { usePromptUsage } from "@/hooks/usePromptUsage";
import { useTranslations } from "@/lib/i18n/use-translations";
import { detectTextLanguage } from "@/lib/i18n/detect-text-language";
import { BuilderLibrary } from "@/components/workspace/builder-library";
import { ResultActions, NextTaskActions } from "@/components/workspace/result-actions";
import { CHECKOUT_DRAFT_KEY, parseCheckoutDraft } from "@/lib/checkout-draft";
import { rememberVersion, nextStepIdea, shouldOfferUpgrade, promptFingerprint, type Refinement, type PromptVersion, type Playbook } from "@/lib/workspace";
import { workspaceCopy } from "@/lib/workspace-copy";
import { inferTaskCategory } from "@/lib/idea-suggestions";

// ─── Inner component (uses useSearchParams → needs Suspense) ───────────────

function BuilderInner() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = searchParams.get("id");
  const templateId = searchParams.get("template");
  const packId = searchParams.get("pack");

  // ── Mode ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"single" | "pack">(searchParams.get("mode") === "pack" ? "pack" : "single");

  // ── Core builder state ──────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolId>("claude");
  const [context, setContext] = useState<PromptContext>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [score, setScore] = useState<import("@/types/prompt").PromptScore | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const savedFingerprint = useRef<string | null>(null);
  const generationLock = useRef(false);
  const initializedDraft = useRef(false);
  const generationController = useRef<AbortController | null>(null);
  useEffect(() => () => generationController.current?.abort(), []);

  // ── Pack save state ─────────────────────────────────────────────────────
  const [savedPackId, setSavedPackId] = useState<string | null>(null);
  const [isPackSaved, setIsPackSaved] = useState(false);

  // ── Generation run request IDs (for linking saves to generation_runs) ───
  const [generateRequestId, setGenerateRequestId] = useState<string | null>(null);
  const [packRequestId, setPackRequestId] = useState<string | null>(null);

  // ── Pack state ──────────────────────────────────────────────────────────
  const [packType, setPackType] = useState<PackType>("build_an_app");
  const [packResult, setPackResult] = useState<PromptPack | null>(null);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  // ── Async operation states ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);
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

  const { t, language } = useTranslations();
  const copy = composerCopy(language);
  const workspaceText = workspaceCopy(language);
  const { isPaid, remainingThisWeek, isLoading: usageLoading } = usePromptUsage();
  const resumeLoaded = useRef(false);
  useEffect(() => {
    if (searchParams.get("resume") !== "checkout" || resumeLoaded.current || promptId || packId) return;
    resumeLoaded.current = true;
    try {
      const draft = parseCheckoutDraft(sessionStorage.getItem(CHECKOUT_DRAFT_KEY));
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      if (draft) {
        setIdea(draft.idea); setContext(draft.context); setTool(draft.tool); setGeneratedPrompt(draft.prompt);
        setSavedId(draft.savedId); setHasCopied(draft.copied); setIsSaved(draft.saved);
        if (draft.saved) savedFingerprint.current = promptFingerprint({ idea: draft.idea, context: draft.context, target_tool: draft.tool, generated_prompt: draft.prompt, score: null });
      }
    } catch { /* Storage may be unavailable; saved prompts remain in History. */ }
  }, [searchParams, promptId, packId]);
  function preserveCheckoutDraft() {
    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ idea, context, prompt: generatedPrompt, tool, savedId, copied: hasCopied, saved: isSaved, createdAt: Date.now() }));
    } catch { showToast("error", "Save your prompt before leaving; browser storage is unavailable."); return false; }
    return true;
  }

  // ── Analytics: builder_opened (fires once on mount) ─────────────────────
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
    } catch { /* A malformed draft must not prevent opening the builder. */ }
  }, [promptId, templateId, packId, searchParams]);

  // ── Prefill from Model Lab "Use this output" ──────────────────────────────
  // Reads sessionStorage once on mount. Runs before other load effects so that
  // promptId / packId effects (which run on their own deps) can override if needed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("ump:lab_output");
    if (!raw) return;
    sessionStorage.removeItem("ump:lab_output");
    try {
      const {
        idea: i,
        tool: labTool,
        generatedPrompt: p,
        score: s,
      } = JSON.parse(raw) as {
        idea?: string;
        tool?: ToolId;
        generatedPrompt?: string;
        score?: import("@/types/prompt").PromptScore | null;
        model?: string;
        source?: string;
      };
      if (i) setIdea(i);
      const parsedTool: ToolId | undefined =
        labTool === "claude" || labTool === "cursor" || labTool === "chatgpt" ? labTool : undefined;
      if (parsedTool) setTool(parsedTool);
      if (p) {
        setGeneratedPrompt(p);
        setIsSaved(false);
        if (s && typeof s === "object") {
          // Score already available from Model Lab — restore it directly.
          setScore(s as import("@/types/prompt").PromptScore);
          showToast("success", t("builder.modelLabLoaded"));
        } else {
          // No score in payload — trigger scoring now.
          // Pass idea/tool explicitly because runScoring's closure still
          // holds the empty initial values at this point in the mount cycle.
          showToast("success", t("builder.modelLabScoring"));
          runScoring(p, { idea: i, tool: parsedTool });
        }
      }
    } catch {
      // malformed storage — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load existing prompt when ?id= is present ───────────────────────────
  useEffect(() => {
    if (!promptId) return;

    setIsLoading(true);
    const controller = new AbortController();
    fetch(`/api/prompts/${promptId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(({ data, error }: { data?: PromptRecord; error?: string }) => {
        if (error || !data) {
          showToast("error", error ?? "Failed to load prompt.");
          return;
        }
        setIdea(data.idea);
        setTool(data.target_tool);
        savedFingerprint.current = promptFingerprint({ ...data, context: data.context ?? {} });
        setHasCopied(false); setSavedThisSession(false);
        setContext(data.context ?? {});
        setGeneratedPrompt(data.generated_prompt);
        setScore(data.score);
        setSavedId(data.id);
        setIsSaved(true);
        track("prompt_reopened", { target_tool: data.target_tool });
      })
      .catch(() => { if (!controller.signal.aborted) showToast("error", "Failed to load prompt."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
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
    if (savedId) setIsSaved(savedFingerprint.current === promptFingerprint({ idea, target_tool: tool, context, generated_prompt: generatedPrompt, score }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, tool, context, generatedPrompt, score, savedId]);

  // ── Score helper (shared by generate flow, manual retry, and optimize) ─────
  const runScoring = useCallback(async (
    prompt: string,
    opts?: { idea?: string; tool?: ToolId; universal?: boolean }
  ): Promise<import("@/types/prompt").PromptScore | null> => {
    const effectiveIdea = opts?.idea ?? idea;
    const effectiveTool = opts?.tool ?? tool;
    setScoreError(null);
    setIsScoring(true);
    try {
      const res = await fetch("/api/prompts/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generated_prompt: prompt, idea: effectiveIdea, target_tool: effectiveTool, universal: opts?.universal ?? context.universal }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setScore(data);
        track("prompt_scored", { target_tool: effectiveTool, score_overall: data.overall });
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
  }, [idea, tool, context.universal]);

  // ── Manual retry (called from ScorePanel error state) ────────────────────
  const handleRetryScore = useCallback(() => {
    if (!generatedPrompt || isScoring || isGenerating) return;
    runScoring(generatedPrompt);
  }, [generatedPrompt, isScoring, isGenerating, runScoring]);

  // ── Optimize weak dimensions ─────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (!generatedPrompt || !score || isOptimizing || isGenerating || isScoring || isSaving) return;

    const prevOverall = score.overall;
    setIsOptimizing(true);  // stays true through optimize + re-score
    setOptimizeError(null);
    setIsSaved(false);

    try {
      const outputLanguage = detectTextLanguage(idea, language);
      const res = await fetch("/api/prompts/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          target_tool: tool,
          context,
          generated_prompt: generatedPrompt,
          score,
          outputLanguage,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOptimizeError(json.error ?? "Optimization failed. Try again.");
        return;
      }
      const improved: string = json.data?.improved_prompt;
      if (!improved || improved.length > 16000) {
        setOptimizeError(improved ? "The optimized prompt is too long. Try a smaller task." : "Optimization returned an empty prompt.");
        return;
      }
      setGeneratedPrompt(improved);
      setContext({ ...context, versions: rememberVersion(context.versions, generatedPrompt, "Quality optimization") });
      setHasCopied(false);
      setSavedThisSession(false);
      setGenerateRequestId(null);
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
  }, [generatedPrompt, score, idea, tool, context, language, isOptimizing, isGenerating, isScoring, isSaving, runScoring]);

  // ── Generate Pack ────────────────────────────────────────────────────────
  const handleGeneratePack = useCallback(async () => {
    if (!idea.trim()) {
      showToast("error", t("builder.addIdeaFirst"));
      return;
    }
    if (isGeneratingPack) return;

    setIsGeneratingPack(true);
    setPackResult(null);
    setPackError(null);
    setPackRequestId(null);

    const outputLanguage = detectTextLanguage(idea, language);

    try {
      const res = await fetch("/api/prompt-packs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, pack_type: packType, context, outputLanguage }),
      });
      const json = await res.json();
      if (!res.ok) {
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
      const packReqId = res.headers.get("X-Request-Id");
      if (packReqId) setPackRequestId(packReqId);
      track("prompt_pack_generated", { pack_type: packType });
      window.dispatchEvent(new Event("prompt_usage_refresh"));
    } catch (err) {
      console.error("[handleGeneratePack]", err);
      setPackError("Pack generation failed. Check your connection and try again.");
    } finally {
      setIsGeneratingPack(false);
    }
  }, [idea, packType, context, language, isGeneratingPack, savedPackId, t]);

  // ── Generate (real AI streaming via /api/prompts/generate) ──────────────
  const handleGenerate = useCallback(async (nextContext?: PromptContext, refinement?: Refinement) => {
    if (!idea.trim()) {
      showToast("error", t("builder.addIdeaFirst"));
      return;
    }
    if (generationLock.current || isGenerating || isScoring || isOptimizing || isSaving) return;
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

    const outputLanguage = detectTextLanguage(idea, language);
    track("prompt_language_detected", { inputLanguage: outputLanguage, outputLanguage } as never);

    setIsGenerating(true);
    if (!refinement) { setGeneratedPrompt(""); setScore(null); }
    setHasCopied(false);
    setSavedThisSession(false);
    setScoreError(null);
    setIsSaved(false);
    setGenerateRequestId(null);

    const controller = new AbortController();
    generationController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const res = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ idea, target_tool: tool, context: effectiveContext, outputLanguage, refinement: refinement ? { action: refinement, prompt: originalPrompt } : undefined }),
      });

      if (!res.ok) {
        try {
          const j = await res.json();
          if (j?.upgradeRequired) {
            dispatchPaywallOpen();
            // Refresh sidebar so it shows 0 remaining
            window.dispatchEvent(new Event("prompt_usage_refresh"));
            return;
          }
          if (j?.error) {
            showToast("error", j.error);
            return;
          }
        } catch { /* fall through to generic */ }
        showToast("error", `Generation failed (HTTP ${res.status}).`);
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

      accumulated += decoder.decode();
      if (!accumulated.trim()) throw new Error("No prompt was returned. Please try again.");
      if (accumulated.length > 16000) throw new Error("The generated prompt is too long. Please try a smaller task.");
      completed = true;
      setGeneratedPrompt(accumulated);
      setContext({ ...effectiveContext, versions: refinement ? rememberVersion(effectiveContext.versions, originalPrompt, refinement) : [] });
      setScore(null);
      if (refinement) track("prompt_refined", { action_type: refinement, category: effectiveContext.category });

      // Capture request_id from header for linking to saved prompt
      const reqId = res.headers.get("X-Request-Id");
      if (reqId) setGenerateRequestId(reqId);

      // Generation done — hand off to scoring (separate phase)
      setIsGenerating(false);
      track("prompt_generated", { target_tool: tool });
      window.dispatchEvent(new Event("prompt_usage_refresh"));
      await runScoring(accumulated, { universal: effectiveContext.universal });
    } catch (err) {
      setGeneratedPrompt(originalPrompt);
      setScore(originalScore);
      setIsSaved(wasSaved);
      const message = err instanceof Error ? err.message : "Generation failed.";
      showToast("error", message);
    } finally {
      if (!completed) {
        setGeneratedPrompt(originalPrompt); setScore(originalScore); setIsSaved(wasSaved);
        setHasCopied(wasCopied); setGenerateRequestId(previousRequestId);
        setSavedThisSession(wasSavedThisSession);
      }
      clearTimeout(timeout);
      generationLock.current = false;
      generationController.current = null;
      setIsGenerating(false); // safety reset if streaming itself threw
    }
  }, [idea, tool, context, language, isGenerating, isScoring, isOptimizing, isSaving, generatedPrompt, score, isSaved, hasCopied, savedThisSession, generateRequestId, runScoring, t]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saveLock.current || isGenerating || isScoring || isOptimizing) return;
    if (!idea.trim() || !generatedPrompt.trim()) {
      showToast("error", t("builder.generateFirst"));
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
          // Update existing record
          const res = await fetch(`/api/prompts/${savedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Update failed.");
          savedFingerprint.current = promptFingerprint(body);
          setIsSaved(true);
          setSavedThisSession(true);
          showToast("success", t("builder.promptUpdated"));
          track("prompt_saved", { target_tool: tool, action_type: "update" });
        } else {
          // Create new record
          const res = await fetch("/api/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, request_id: generateRequestId }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Save failed.");
          savedFingerprint.current = promptFingerprint(body);
          setSavedId(json.data.id);
          setIsSaved(true);
          setSavedThisSession(true);
          // Update URL without a full navigation so the page knows its ID
          router.replace(`/builder?id=${json.data.id}`, { scroll: false });
          showToast("success", t("builder.promptSaved"));
          track("prompt_saved", { target_tool: tool, action_type: "create" });
          window.dispatchEvent(new Event("prompt_usage_refresh"));
        }
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Save failed.");
      } finally {
        saveLock.current = false;
        setIsSaving(false);
      }
  }, [idea, tool, context, generatedPrompt, score, savedId, router, t, generateRequestId, isGenerating, isScoring, isOptimizing]);

  const startTask = useCallback((nextIdea: string, nextContext: PromptContext): boolean => {
    if (generationLock.current || isGenerating || isScoring || isOptimizing || isSaving) return false;
    if (generatedPrompt && !isSaved && !window.confirm(workspaceText.confirmReplace)) return false;
    setIdea(nextIdea); setContext(nextContext); setGeneratedPrompt(""); setScore(null);
    savedFingerprint.current = null;
    setSavedId(null); setIsSaved(false); setHasCopied(false); setSavedThisSession(false); setGenerateRequestId(null);
    setScoreError(null); setIsLoading(false);
    router.replace("/builder", { scroll: false });
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    return true;
  }, [generatedPrompt, isSaved, isGenerating, isScoring, isOptimizing, isSaving, workspaceText.confirmReplace, router, reducedMotion]);
  const applyPlaybook = useCallback((playbook: Playbook) => startTask(playbook.idea, { ...playbook.context, universal: true }), [startTask]);
  function restoreVersion(version: PromptVersion) {
    if (isGenerating || isScoring || isOptimizing || isSaving) return;
    setContext({ ...context, versions: rememberVersion((context.versions ?? []).filter((v) => v !== version), generatedPrompt, "Restored version") });
    setGeneratedPrompt(version.prompt); setScore(null); setIsSaved(false); setHasCopied(false); setSavedThisSession(false); setGenerateRequestId(null);
    track("prompt_version_restored"); showToast("success", workspaceText.restored);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (!savedId) return;
    if (!window.confirm(t("builder.deleteConfirm"))) return;

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
        showToast("success", t("builder.promptDeleted"));
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : t("builder.loadFailed"));
      }
    });
  }, [savedId, router, t]);

  // ── Save Pack ─────────────────────────────────────────────────────────────
  const handleSavePack = useCallback(() => {
    if (!idea.trim() || !packResult) {
      showToast("error", t("builder.generatePackFirst"));
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
          showToast("success", t("builder.packUpdated"));
          track("prompt_pack_saved", { pack_type: packType, action_type: "update" });
        } else {
          const res = await fetch("/api/prompt-packs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, request_id: packRequestId }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Save failed.");
          setSavedPackId(json.data.id);
          setIsPackSaved(true);
          showToast("success", t("builder.packSaved"));
          track("prompt_pack_saved", { pack_type: packType, action_type: "create" });
          window.dispatchEvent(new Event("prompt_usage_refresh"));
        }
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Save failed.");
      }
    });
  }, [idea, packType, context, packResult, savedPackId, t, packRequestId]);

  // ── Delete Pack ───────────────────────────────────────────────────────────
  const handleDeletePack = useCallback(() => {
    if (!savedPackId) return;
    if (!window.confirm(t("builder.deletePackConfirm"))) return;

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
        showToast("success", t("builder.packDeleted"));
        track("prompt_pack_deleted", { pack_type: packType });
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }, [savedPackId, packType, router, t]);

  // ── Title for breadcrumb ──────────────────────────────────────────────────
  const breadcrumbTitle = idea.trim()
    ? generateTitleFromIdea(idea)
    : t("builder.untitledPrompt");

  return (
    <AppShell modern>
      <Topbar
        breadcrumb={[
          { label: t("nav.workspace") },
          { label: t("nav.builder") },
          { label: breadcrumbTitle },
        ]}
        actions={
          <div className="hidden md:flex items-center gap-2">
            {mode === "pack" && isPaid ? (
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
                    {t("builder.delete")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSavePack}
                  disabled={isSavingPack || isLoading || isGeneratingPack || !packResult}
                >
                  <ActionIcon pending={isSavingPack} success={isPackSaved} icon={Save} />
                  {isPackSaved ? t("builder.saved") : savedPackId ? t("builder.updatePack") : t("builder.savePack")}
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
                  <ActionIcon pending={isSaving} success={isSaved} icon={Save} />
                  {isSaved ? t("builder.saved") : savedId ? t("builder.update") : t("builder.saveDraft")}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Toast notification */}
      <AnimatePresence>
      {toast && (
        <motion.div role="status"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          className={cn(
            "fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm",
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
        </motion.div>
      )}
      </AnimatePresence>

      <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-12">
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-zinc-900 leading-tight">
              {mode === "pack" ? t("builder.packTitle") : copy.title}
            </h1>
            <p className="text-sm text-ink-400 mt-1">
              {mode === "pack"
                ? t("builder.packSubtitle")
                : copy.subtitle}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex p-1 bg-white rounded-md border border-zinc-200 shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition-all",
                mode === "single" ? "bg-white text-ink-900 card-soft shadow-sm" : "text-ink-500 hover:text-ink-700"
              )}
            >
              <Wand2 className="size-3.5" />
              {t("builder.single")}
            </button>
            <button
              type="button"
              onClick={() => setMode("pack")}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition-all",
                mode === "pack" ? "bg-white text-ink-900 card-soft shadow-sm" : "text-ink-500 hover:text-ink-700"
              )}
            >
              <Layers className="size-3.5" />
              {t("builder.pack")}
              {!usageLoading && !isPaid && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-clay-600 bg-clay-500/10 border border-clay-200/50 rounded-full px-1.5 py-0.5 leading-none">
                  <Crown className="size-2.5" />
                  Pro
                </span>
              )}
            </button>
          </div>
        </div>

        {isLoading || (mode === "pack" && usageLoading) ? (
          <BuilderSkeleton />
        ) : mode === "pack" && !isPaid ? (
          <PacksUpsell />
        ) : mode === "pack" ? (
          /* ── Pack mode layout ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-5">
              <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5 space-y-5">
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
                  <><Loader2 className="size-4 animate-spin" />{t("builder.generatingPack")}</>
                ) : (
                  <><Layers className="size-4" />{packResult ? t("builder.regeneratePack") : t("builder.generatePack")}</>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full md:hidden"
                onClick={handleSavePack}
                disabled={isSavingPack || isGeneratingPack || !packResult}
              >
                <ActionIcon pending={isSavingPack} success={isPackSaved} icon={Save} />
                {isPackSaved ? t("builder.saved") : savedPackId ? t("builder.updatePack") : t("builder.savePack")}
              </Button>
            </div>
            <div className="lg:col-span-8">
              <PromptPackOutput pack={packResult} isGenerating={isGeneratingPack} error={packError} />
            </div>
          </div>
        ) : (
          <>
          <BuilderLibrary idea={idea} context={context} busy={isGenerating || isScoring || isOptimizing || isSaving} onPlaybook={applyPlaybook} onContextChange={setContext} onNavigate={preserveCheckoutDraft} playbookId={searchParams.get("playbook")} profileId={searchParams.get("profile")} />
          <IdeaComposer idea={idea} onIdeaChange={setIdea} context={context} onContextChange={setContext}
            onGenerate={handleGenerate} busy={isGenerating || isScoring || isOptimizing || isSaving}
            generating={isGenerating || isOptimizing} hasResult={!!generatedPrompt.trim()}
            onSave={handleSave} saving={isSaving} saved={isSaved}
            outcomeEligible={hasCopied}
            resultActions={!!generatedPrompt && !isGenerating && <ResultActions busy={isScoring || isOptimizing || isSaving} versions={context.versions} onRefine={(action) => void handleGenerate(undefined, action)} onRestore={restoreVersion} />}
            nextActions={!!generatedPrompt && !isGenerating && <NextTaskActions busy={isScoring || isOptimizing || isSaving} category={context.category && context.category !== "auto" ? context.category : inferTaskCategory(idea, language)} onNext={(instruction, index) => {
              const { versions: _versions, clarifications: _answers, ...reusable } = context;
              if (startTask(nextStepIdea(idea, instruction), reusable)) track("next_step_selected", { category: context.category, option: String(index) });
            }} />}
            upgrade={shouldOfferUpgrade(isPaid, hasCopied || savedThisSession, remainingThisWeek) && !usageLoading && !isGenerating && !isScoring && !isOptimizing && <UpgradeCTA variant="low_remaining" remainingThisWeek={remainingThisWeek ?? 7} sourcePage="builder" returnTo="/builder?resume=checkout" onNavigate={preserveCheckoutDraft} />}
            result={<PromptOutput prompt={generatedPrompt} targetTool={tool} universal isSaved={isSaved} isGenerating={isGenerating} isOptimizing={isOptimizing} onCopied={() => setHasCopied(true)} onRegenerate={() => void handleGenerate()} />}
            quality={<ScorePanel score={score} isScoring={isScoring} error={scoreError} onRetry={handleRetryScore} onOptimize={handleOptimize} isOptimizing={isOptimizing} optimizeError={optimizeError} />}
          />
          </>
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
