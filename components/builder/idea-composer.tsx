"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { WandSparkles, ArrowUpRight, Code2, PenLine, Search, Sun, BriefcaseBusiness, Palette, Sparkles, Shuffle, Loader2, Save, Plus } from "lucide-react";
import { ActionIcon } from "@/components/ui/action-icon";
import { Disclosure } from "@/components/ui/disclosure";
import { IdeaPlaceholder } from "@/components/builder/idea-placeholder";
import { useTranslations } from "@/lib/i18n/use-translations";
import { composerCopy } from "@/lib/composer-copy";
import { TASK_CATEGORIES, isTaskCategory } from "@/lib/task-categories";
import { getSuggestions, getStarterSuggestions } from "@/lib/idea-suggestions";
import { useIdeaSuggestions } from "@/hooks/useIdeaSuggestions";
import { detectTextLanguage } from "@/lib/i18n/detect-text-language";
import type { ClarificationQuestion } from "@/lib/ai/clarify-idea";
import type { PromptContext } from "@/types/prompt";
import { track } from "@/lib/analytics";
import { dispatchPaywallOpen } from "@/components/billing/paywall-modal";
import { cn } from "@/lib/utils";
import { canExpandIdea } from "@/lib/prompt-editing";
import { OutcomeFeedback } from "@/components/builder/outcome-feedback";
import type { TaskMetric } from "@/lib/task-metrics";

const ICONS = { auto: Sparkles, writing: PenLine, coding: Code2, research: Search, daily: Sun, business: BriefcaseBusiness, creative: Palette };

interface Props {
  guest?: boolean;
  example?: React.ReactNode;
  idea: string;
  onIdeaChange: (value: string) => void;
  context: PromptContext;
  onContextChange: (value: PromptContext) => void;
  onGenerate: (context: PromptContext) => Promise<void> | void;
  busy?: boolean;
  generating?: boolean;
  result?: React.ReactNode;
  resultActions?: React.ReactNode;
  nextActions?: React.ReactNode;
  upgrade?: React.ReactNode;
  quality?: React.ReactNode;
  hasResult?: boolean;
  canSave?: boolean;
  onSave?: () => void;
  onNewIdea?: () => void;
  saving?: boolean;
  saved?: boolean;
  outcomeEligible?: boolean;
  taskMetric?: TaskMetric | null;
  outcomeValue?: boolean | null;
  onOutcomeChange?: (value: boolean) => void;
}

export function IdeaComposer({ guest, example, idea, onIdeaChange, context, onContextChange, onGenerate, busy, generating, result, resultActions, nextActions, upgrade, quality, hasResult, canSave = hasResult, onSave, onNewIdea, saving, saved, outcomeEligible, taskMetric, outcomeValue, onOutcomeChange }: Props) {
  const { language } = useTranslations();
  const copy = composerCopy(language);
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const categoryGroup = useId();
  const category = isTaskCategory(context.category) ? context.category : "auto";
  const { seed, refresh } = useIdeaSuggestions();
  const suggestions = guest && !idea.trim() && category === "auto"
    ? getStarterSuggestions(seed, language)
    : getSuggestions(idea, category, seed, 6, language);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState("");
  const [localFeedback, setFeedback] = useState<boolean | null>(null);
  const feedback = outcomeValue === undefined ? localFeedback : outcomeValue;
  const [qualityOpen, setQualityOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [requestStarted, setRequestStarted] = useState(false);
  const [editingIdea, setEditingIdea] = useState(false);
  const ideaEdit = useRef<{ idea: string; context: PromptContext } | null>(null);
  const ideaEditSubmitted = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const questionsRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const locked = !!busy || checking;
  const showExamples = !idea && !inputFocused && !locked;
  const showInitialExample = !!example && !requestStarted && !editingIdea && !hasResult && !generating;
  const showResult = (!!hasResult && !editingIdea) || !!generating;

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { if (!outcomeEligible) setFeedback(null); }, [outcomeEligible]);
  useEffect(() => { setFeedback(null); }, [taskMetric?.result_id]);
  useEffect(() => {
    if (!editingIdea) return;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [editingIdea, reducedMotion]);
  useEffect(() => {
    if (!editingIdea || !inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  }, [editingIdea, idea]);
  useEffect(() => {
    if (editingIdea && ideaEditSubmitted.current && hasResult && !generating) {
      setEditingIdea(false); ideaEdit.current = null; ideaEditSubmitted.current = false;
    }
  }, [editingIdea, hasResult, generating]);
  useEffect(() => {
    setQuestions([]); setAnswers([]); setNotice("");
    if (!idea.trim()) setRequestStarted(false);
  }, [idea, category]);
  useEffect(() => {
    if (!questions.length) return;
    questionsRef.current?.focus({ preventScroll: true });
    questionsRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [questions.length, reducedMotion]);
  useEffect(() => {
    if (generating || hasResult) resultRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    if (generating) { setFeedback(null); setQualityOpen(false); }
  }, [generating, hasResult, reducedMotion]);

  async function generate(nextContext: PromptContext) {
    ideaEditSubmitted.current = editingIdea;
    setQuestions([]);
    setNotice("");
    onContextChange(nextContext);
    try { await onGenerate(nextContext); } catch { setNotice(copy.generateError); }
  }

  async function prepare() {
    if (locked || !canExpandIdea(idea)) return;
    setRequestStarted(true);
    const universalContext = { ...context, universal: true, category };
    if (guest) { await generate(universalContext); return; }
    // Previously answered questions remain usable until the idea/category changes.
    if (context.clarifications) { await generate(universalContext); return; }
    setChecking(true);
    setNotice("");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/prompts/clarify", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ idea, category, context, outputLanguage: detectTextLanguage(idea, language) }),
      });
      const json = await response.json();
      if (json.upgradeRequired) { dispatchPaywallOpen(); return; }
      if (response.status === 401) { setNotice("Please sign in again to continue."); return; }
      if (!response.ok) throw new Error();
      const nextQuestions: ClarificationQuestion[] = json.data ?? [];
      if (nextQuestions.length) {
        setQuestions(nextQuestions); setAnswers(nextQuestions.map(() => ""));
        track("clarification_shown", { category });
      } else await generate(universalContext);
    } catch { setNotice(copy.clarifyError); }
    finally { clearTimeout(timeout); requestRef.current = null; setChecking(false); }
  }

  function editIdea(value: string) {
    onIdeaChange(value);
    if (context.clarifications) onContextChange({ ...context, clarifications: undefined });
  }

  function beginIdeaEdit() {
    if (locked || saving) return;
    ideaEdit.current = { idea, context };
    ideaEditSubmitted.current = false;
    setEditingIdea(true); setRequestStarted(true);
  }

  function cancelIdeaEdit() {
    if (locked || !ideaEdit.current) return;
    onIdeaChange(ideaEdit.current.idea);
    onContextChange(ideaEdit.current.context);
    ideaEdit.current = null; ideaEditSubmitted.current = false;
    setEditingIdea(false); setQuestions([]); setAnswers([]); setNotice("");
  }

  return (
    <div className={cn("mx-auto w-full text-zinc-900", showInitialExample ? "grid max-w-5xl gap-x-8 md:grid-cols-2" : "max-w-3xl")}>
      {!showResult && <>
      <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="studio-idea" className="block text-lg font-medium">{copy.idea}</label>
        {editingIdea && <button type="button" disabled={locked} onClick={cancelIdeaEdit} className="min-h-11 text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-40">{copy.cancelIdeaEdit}</button>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void prepare(); }} className="relative rounded-lg border border-zinc-300 bg-white shadow-sm transition-shadow focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/10">
        <div className="relative">
        <textarea ref={inputRef} id="studio-idea" value={idea} maxLength={4000} disabled={locked} aria-describedby={`${categoryGroup}-idea-feedback`}
          onChange={(e) => editIdea(e.target.value)} placeholder={inputFocused ? "" : copy.placeholder} rows={guest ? 3 : 5}
          onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
          className={cn("block w-full resize-y rounded-t-lg border-0 bg-transparent p-5 text-base leading-relaxed text-zinc-900 outline-none disabled:opacity-70 sm:p-6", guest ? "min-h-[140px]" : "min-h-[180px]", showExamples ? "placeholder:text-transparent" : "placeholder:text-zinc-500")} />
        <IdeaPlaceholder key={language} active={showExamples} examples={copy.placeholderIdeas} pauseLabel={copy.pauseExamples} resumeLabel={copy.resumeExamples} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 sm:px-5">
          <span className="text-xs tabular-nums text-zinc-500">{idea.length} / 4000</span>
          <button type="submit" disabled={locked || !canExpandIdea(idea)} className={cn("motion-press flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-base font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40", (checking || generating) && "generation-pulse")}>
            {checking || busy ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <WandSparkles className="size-4 shrink-0" />}
            <span>{checking ? copy.checking : generating ? copy.optimizingRequest : guest ? copy.guestOptimizeRequest : copy.optimizeRequest}</span>
          </button>
        </div>
      </form>
      <p id={`${categoryGroup}-idea-feedback`} className="mt-2 min-h-5 text-sm text-zinc-600">{idea.trim() && !canExpandIdea(idea) ? copy.ideaTooShort : ""}</p>
      </div>
      {showInitialExample && <div className="mt-8 min-w-0 md:col-start-2 md:row-span-6 md:row-start-1 md:mt-0">{example}</div>}

      {notice && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span>{notice}</span><button disabled={locked} type="button" className="font-medium underline" onClick={() => void generate({ ...context, universal: true, category })}>{copy.skip}</button>
      </div>}

      {questions.length > 0 && <section ref={questionsRef} tabIndex={-1} aria-label={copy.details} className="mt-6 scroll-mt-24 border-y border-emerald-200 py-6 outline-none">
        <h2 className="mb-5 text-lg font-semibold">{copy.details}</h2>
        {questions.map((item, index) => <fieldset key={`${index}:${item.question}`} className="mb-5 space-y-3">
          <legend className="mb-2 text-sm font-medium">{item.question}</legend>
          <div className="flex flex-wrap gap-2">{item.options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
            <input type="radio" name={`question-${index}`} checked={answers[index] === option} onChange={() => setAnswers((values) => values.map((v, i) => i === index ? option : v))} className="accent-emerald-700" />{option}
          </label>)}</div>
          <input aria-label={`${copy.custom}: ${item.question}`} value={answers[index] ?? ""} maxLength={600} placeholder={copy.custom}
            onChange={(e) => setAnswers((values) => values.map((v, i) => i === index ? e.target.value : v))}
            className="h-11 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-emerald-600" />
        </fieldset>)}
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={locked} onClick={() => { track("clarification_answered", { category }); void generate({ ...context, universal: true, category, clarifications: questions.map((q, i) => answers[i]?.trim() ? `${q.question}: ${answers[i].trim()}` : "").filter(Boolean).join("\n") }); }}
            className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white"><Sparkles className="size-4" />{copy.continue}</button>
          <button type="button" disabled={locked} className="min-h-11 text-sm text-zinc-500 hover:text-zinc-900" onClick={() => void generate({ ...context, universal: true, category })}>{copy.skip}</button>
        </div>
      </section>}

      {!editingIdea && !hasResult && !generating && !questions.length && <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-medium text-zinc-700">{idea.trim() ? copy.matching : copy.inspiration}</h2>
          <button type="button" onClick={refresh} disabled={locked} title={copy.refresh} aria-label={copy.refresh} className="motion-press flex size-11 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
            <motion.span key={seed} initial={mounted && !reducedMotion ? { rotate: -180, opacity: 0.5 } : false} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.36 }}><Shuffle className="size-4" /></motion.span>
          </button>
        </div>
        <div key={`${language}:${suggestions.map((suggestion) => suggestion.id).join(",")}`} className="grid gap-x-6 sm:grid-cols-2" aria-live="polite">
          {suggestions.map((suggestion, index) => {
            const Icon = ICONS[suggestion.category];
            return <motion.button key={suggestion.id} type="button" disabled={locked} tabIndex={0}
              layout={reducedMotion ? false : "position"}
              initial={mounted && !reducedMotion ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.28, delay: reducedMotion ? 0 : index * 0.04, layout: { duration: reducedMotion ? 0 : 0.28 } }}
              whileHover={reducedMotion || locked ? undefined : { y: -4, transition: { duration: 0.16, delay: 0 } }}
              whileTap={reducedMotion || locked ? undefined : { scale: 0.98, transition: { duration: 0.12, delay: 0 } }} onClick={() => {
              editIdea(guest ? suggestion.title : suggestion.idea); onContextChange({ ...context, category: suggestion.category, universal: true, clarifications: undefined });
              track("idea_suggestion_selected", { category: suggestion.category, suggestion_id: suggestion.id }); inputRef.current?.focus();
            }} className="group flex min-h-[76px] items-center gap-3 border-b border-zinc-100 py-3 text-left disabled:opacity-40">
              <Icon className="size-5 shrink-0 text-emerald-700" />
              <span className="min-w-0 flex-1"><span className="block text-base font-medium leading-snug text-zinc-800 group-hover:text-emerald-700">{suggestion.title}</span></span>
              <ArrowUpRight className="size-4 shrink-0 text-zinc-300 transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5 group-hover:text-emerald-700" />
            </motion.button>;
          })}
        </div>
      </section>}

      <Disclosure label={category === "auto" ? copy.category : `${copy.category}: ${copy.categories[category]}`} open={categoryOpen} onOpenChange={setCategoryOpen}>
      <LayoutGroup id={categoryGroup}>
      <div className="mt-3 flex flex-wrap gap-1" aria-label={copy.category}>
        {TASK_CATEGORIES.map((item) => {
          const Icon = ICONS[item];
          return <button key={item} type="button" disabled={locked} aria-pressed={category === item}
            onClick={() => { onContextChange({ ...context, category: item, universal: true, clarifications: undefined }); track("category_selected", { category: item }); }}
            className={cn("motion-press relative isolate flex min-h-11 items-center gap-2 rounded-md px-3 text-sm disabled:opacity-50", category === item ? "text-white" : "text-zinc-600 hover:bg-zinc-100")}>
            {category === item && <motion.span aria-hidden="true" layoutId="category-highlight" initial={false}
              transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 -z-10 rounded-md bg-emerald-700" />}
            <Icon className={cn("size-4 shrink-0 transition-colors", category !== item && "text-emerald-700")} />{copy.categories[item]}
          </button>;
        })}
      </div>
      </LayoutGroup>
      </Disclosure>

      <Disclosure label={copy.context} open={contextOpen} onOpenChange={setContextOpen}>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {([ ["audience", copy.audience], ["outputFormat", copy.format], ["constraints", copy.constraints] ] as const).map(([key, label]) => (
            <label key={key} className={cn("space-y-2 text-sm text-zinc-600", key === "constraints" && "sm:col-span-2")}>
              <span className="block">{label}</span>
              <input disabled={locked} maxLength={1200} value={context[key] ?? ""} onChange={(e) => onContextChange({ ...context, [key]: e.target.value, clarifications: undefined })}
                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-zinc-900 outline-none focus:border-emerald-600" />
            </label>
          ))}
        </div>
      </Disclosure>

      </>}
      {showResult && <section ref={resultRef} className="prompt-reveal scroll-mt-24">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
          <div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm text-zinc-500">{copy.idea}</p>
            <button type="button" onClick={beginIdeaEdit} disabled={locked || saving} aria-label={copy.editIdea} className="motion-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"><PenLine className="size-4" aria-hidden="true" />{copy.edit}</button>
          </div><p data-rough-idea className="whitespace-pre-wrap break-words text-base text-zinc-700">{idea}</p></div>
          {onNewIdea && <button type="button" onClick={onNewIdea} disabled={locked || saving} className="motion-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"><Plus className="size-4" aria-hidden="true" />{copy.newIdea}</button>}
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{context.delivery === "answer" ? ({ en: "Your result", ru: "Ваш результат", es: "Tu resultado" })[language] : copy.result}</h2>
          {onSave && <button type="button" disabled={saving || busy || !canSave} onClick={onSave} className={cn("motion-press flex min-h-11 items-center gap-2 rounded-md px-3 text-base hover:bg-zinc-100 disabled:opacity-40", saved ? "text-emerald-700" : "text-zinc-600")}>
            <ActionIcon pending={saving} success={saved} icon={Save} />
            <span className="grid">
              <span aria-hidden="true" className="invisible col-start-1 row-start-1">{copy.save}</span>
              <span aria-hidden="true" className="invisible col-start-1 row-start-1">{copy.saved}</span>
              <span aria-live="polite" className="col-start-1 row-start-1">{saved ? copy.saved : copy.save}</span>
            </span>
          </button>}
        </div>
        {resultActions}
        <div className="h-[min(640px,75dvh)] min-h-[520px]">{result}</div>
        {hasResult && outcomeEligible && !busy && <OutcomeFeedback key={taskMetric?.result_id ?? idea} value={feedback} onFeedback={(value) => {
          track("answer_outcome_feedback", { category, ...taskMetric, outcome: value, ...(value !== "not_tried" && { improved: value === "useful" }) });
          if (value === "not_tried" || feedback !== null) return;
          setFeedback(value === "useful");
          onOutcomeChange?.(value === "useful");
          if (value === "useful" && taskMetric) track("prompt_result_confirmed", { category, ...taskMetric, outcome: value });
        }} />}
        {upgrade && <div className="mt-4">{upgrade}</div>}
        {nextActions}
        {quality && <Disclosure label={copy.quality} open={qualityOpen} onOpenChange={setQualityOpen}>
          <p className="my-3 text-xs text-zinc-500">{copy.qualityNote}</p><div className="min-h-[480px]">{quality}</div>
        </Disclosure>}
      </section>}
    </div>
  );
}
