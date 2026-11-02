"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, BookOpen, Mail, CalendarDays, Lightbulb, BriefcaseBusiness, Sparkles, Check, Copy, PenLine, Save, Globe, Loader2, ShieldCheck } from "lucide-react";
import { LandingGuide } from "@/components/builder/landing-guide";
import { Logo } from "@/components/brand/logo";
import { useTranslations } from "@/lib/i18n/use-translations";
import { beginnerCopy, beginnerQuestions } from "@/lib/beginner-copy";
import { BEGINNER_DRAFT_KEY, parseBeginnerDraft, type BeginnerResult } from "@/lib/beginner-draft";
import { createClient } from "@/lib/supabase/client";
import { canExpandIdea } from "@/lib/prompt-editing";
import { languageLabels, type AppLanguage } from "@/types/language";
import { detectTextLanguage } from "@/lib/i18n/detect-text-language";
import { ScorePanel } from "@/components/builder/score-panel";
import { OutcomeFeedback } from "@/components/builder/outcome-feedback";
import { PromptRenderer } from "@/components/builder/prompt-output";
import { IdeaPlaceholder } from "@/components/builder/idea-placeholder";
import { IdeaReview } from "@/components/builder/idea-review";
import { composerCopy } from "@/lib/composer-copy";
import { rememberVersion, type WorkspaceItem, type ContextProfile } from "@/lib/workspace";
import { dailyCopy } from "@/lib/daily-copy";
import { dailyTaskKind } from "@/lib/daily-tasks";
import { parsePromptContext } from "@/lib/prompt-context";
import { ProfileChooser, SavedTaskDetails, DailyResultTools } from "@/components/workspace/daily-task-tools";
import type { PromptContext, PromptScore } from "@/types/prompt";
import { track } from "@/lib/analytics";
import { nextTaskMetric, type TaskMetric } from "@/lib/task-metrics";

const icons = [BookOpen, Mail, CalendarDays, Lightbulb, BriefcaseBusiness, Sparkles];
export function StartExperience() {
  const { language, setLanguage } = useTranslations(); const c = beginnerCopy(language); const router = useRouter();
  const d = dailyCopy(language); const params = useSearchParams();
  const sourceId=params.get("id"); const routineId=params.get("routine") ?? params.get("playbook"); const taskId=params.get("task"); const profileId=params.get("profile"); const fresh=params.has("fresh");
  const explicitSource=!!(sourceId||routineId||taskId||profileId||fresh); const initialExplicitSource=useRef(explicitSource);
  const [routine,setRoutine]=useState<WorkspaceItem|null>(null); const [appliedProgress,setAppliedProgress]=useState(""); const [detailsApplied,setDetailsApplied]=useState(false);
  const [profile,setProfile]=useState<(ContextProfile&{id:string;name:string})|null>(null);
  const [profileChoiceId,setProfileChoiceId]=useState(profileId??undefined);
  const [sourceError,setSourceError]=useState(false); const [sourceLoading,setSourceLoading]=useState(false); const [sourceRetry,setSourceRetry]=useState(0);
  const sourceLoaded=useRef(""); const restoreRoutineId=useRef<string|undefined>(undefined);
  const [step, setStep] = useState(0); const [idea, setIdea] = useState("");
  const [ideaEditing, setIdeaEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}); const [custom, setCustom] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState(""); const [delivery, setDelivery] = useState<"prompt" | "answer">("prompt");
  const [result, setResult] = useState<BeginnerResult | null>(null); const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [limited, setLimited] = useState(false); const [weeklyLimited, setWeeklyLimited] = useState(false); const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false); const [editText, setEditText] = useState(""); const [score, setScore] = useState<PromptScore | null>(null);
  const [qualityOpen, setQualityOpen] = useState(false); const [qualityError, setQualityError] = useState<string | null>(null); const [outcome, setOutcome] = useState<boolean | null>(null); const [metric, setMetric] = useState<TaskMetric | null>(null);
  const panel = useRef<HTMLDivElement>(null); const ideas = useRef<HTMLElement>(null); const controller = useRef<AbortController | null>(null); const inFlight = useRef(false);
  const questions = beginnerQuestions(idea, language);
  const previousLanguage = useRef(language);
  useEffect(() => {
    if (previousLanguage.current === language) return;
    const previous = beginnerQuestions(idea, previousLanguage.current);
    const current = beginnerQuestions(idea, language);
    setAnswers((values) => Object.fromEntries(Object.entries(values).map(([id, value]) => {
      const index = previous.find((q) => q.id === id)?.options.indexOf(value) ?? -1;
      return [id, index >= 0 ? current.find((q) => q.id === id)?.options[index] ?? value : value];
    })));
    previousLanguage.current = language;
  }, [language, idea]);
  useEffect(() => {
    let draft: ReturnType<typeof parseBeginnerDraft> = null;
    const restore = (value: NonNullable<typeof draft>) => { setIdea(value.idea); setAnswers(value.answers); setExtra(value.extra); setDelivery(value.delivery); setResult(value.result); setStep(value.result ? 2 : value.idea ? 1 : 0); setMetric(value.metric); setOutcome(value.outcome);restoreRoutineId.current=value.routineId; };
    try { draft = initialExplicitSource.current ? null : parseBeginnerDraft(sessionStorage.getItem(BEGINNER_DRAFT_KEY)); if (draft && !draft.owner) restore(draft); } catch {}
    const supabase = createClient(); let active = true; let changed = false; let account: string | null = null;
    const resolveUser = (id: string | null) => {
      if (!active) return;
      if ((draft?.owner && draft.owner !== id) || (account && account !== id)) {
        setIdea(""); setIdeaEditing(false); setAnswers({}); setExtra(""); setResult(null); setStep(0); setScore(null); setMetric(null);setProfile(null);setRoutine(null);setAppliedProgress("");sourceLoaded.current="";
        try { sessionStorage.removeItem(BEGINNER_DRAFT_KEY); } catch {}
      } else if (draft?.owner === id && draft) restore(draft);
      draft = null; account = id; setUserId(id); setAuthReady(true); setDraftReady(true);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === "INITIAL_SESSION") return; changed = true; resolveUser(session?.user?.id ?? null); });
    void supabase.auth.getUser().then(({ data }) => { if (!changed) resolveUser(data.user?.id ?? null); }).catch(() => { if (active) setAuthReady(true); });
    return () => { active = false; listener.subscription.unsubscribe(); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if(!authReady)return;
    const key=[userId,sourceId,routineId,taskId,profileId,fresh,sourceRetry,language].join("|"); if(sourceLoaded.current===key)return; sourceLoaded.current=key;
    if(!explicitSource)return;
    const abort=new AbortController(); setSourceError(false);setIdeaEditing(false);setRoutine(null);setDetailsApplied(false);setProfile(null);setAppliedProgress("");setError("");
    if(fresh){setIdea("");setAnswers({});setExtra("");setResult(null);setStep(0);router.replace("/builder");return;}
    if(taskId){const task=beginnerCopy(language).tasks.find(t=>t.id===taskId);if(task){setIdea(task.idea);setAnswers({});setExtra("");setResult(null);setStep(1);router.replace("/builder");}else setSourceError(true);return;}
    if(profileId&&!routineId&&!sourceId){setProfileChoiceId(profileId);router.replace("/builder");return;}
    if(!userId)return;
    const id=sourceId||routineId; if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){setSourceError(true);return;}
    setSourceLoading(true);
    void (async()=>{try{
      const response=await fetch(sourceId?`/api/prompts/${id}`:"/api/workspace",{signal:abort.signal});const json=await response.json();if(!response.ok)throw new Error();
      if(sourceId){const item=json.data;const parsed=parsePromptContext(item?.context);if(!parsed.data||typeof item.idea!=="string"||typeof item.generated_prompt!=="string")throw new Error();
        const input=parsed.data.preferences;setIdea(item.idea);setAnswers(input?.answers??{});setExtra(input?.extra??"");setDelivery(parsed.data.delivery??"prompt");setResult({idea:item.idea,text:item.generated_prompt,context:parsed.data,savedId:item.id,saved:true});setScore(item.score??null);setStep(2);setCopied(false);setEditing(false);setMetric(nextTaskMetric(null,false));router.replace("/builder");
      }else{const item=(json.data as WorkspaceItem[]).find(item=>item.id===id&&item.kind==="playbook");if(!item||item.kind!=="playbook")throw new Error();setRoutine(item);setIdea(item.payload.idea);setAnswers({});setExtra("");setDelivery(item.payload.context.delivery??"prompt");setResult(null);setStep(1);router.replace("/builder");}
    }catch{if(!abort.signal.aborted)setSourceError(true);}finally{if(!abort.signal.aborted)setSourceLoading(false);}})();
    return()=>abort.abort();
  },[authReady,userId,sourceId,routineId,taskId,profileId,fresh,sourceRetry,explicitSource,language,router]);
  useEffect(() => { if (!step) return; panel.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }, [step]);
  useEffect(()=>{if(!authReady||!userId||!restoreRoutineId.current)return;const id=restoreRoutineId.current;restoreRoutineId.current=undefined;const abort=new AbortController();void fetch("/api/workspace",{signal:abort.signal}).then(r=>r.ok?r.json():null).then(json=>{if(!abort.signal.aborted){const item=json?.data?.find((item:WorkspaceItem)=>item.id===id&&item.kind==="playbook");if(item)setRoutine(item);}}).catch(()=>{});return()=>abort.abort();},[authReady,userId]);
  function preserve(nextResult = result) {
    try { sessionStorage.setItem(BEGINNER_DRAFT_KEY, JSON.stringify({ owner: userId, ...(routine ? {routineId:routine.id}:{}), idea, answers, extra, delivery, result: nextResult, metric, outcome, createdAt: Date.now() })); return true; } catch { setError(c.storageError); return false; }
  }
  function signIn() { if (preserve()) router.push("/login?next=" + encodeURIComponent(explicitSource ? "/builder?" + params.toString() : "/")); }
  useEffect(() => {
    if (!draftReady) return;
    if (!idea && !result) { try { sessionStorage.removeItem(BEGINNER_DRAFT_KEY); } catch {} return; }
    const timer = setTimeout(() => { try { sessionStorage.setItem(BEGINNER_DRAFT_KEY, JSON.stringify({ owner: userId, ...(routine ? {routineId:routine.id}:{}), idea, answers, extra, delivery, result, metric, outcome, createdAt: Date.now() })); } catch {} }, 250);
    return () => clearTimeout(timer);
  }, [draftReady, userId, idea, answers, extra, delivery, result, metric, outcome, routine]);
  function begin(value = idea) { if (!canExpandIdea(value)) { setError(c.invalid); return; } setIdea(value); setStep(1); setError(""); setLimited(false); setWeeklyLimited(false); }
  function pick(value: string) { setIdea(value); setAnswers({}); setCustom({}); setExtra(""); setDelivery("prompt"); setError(""); if (value) setStep(1); else document.getElementById("beginner-idea")?.focus(); }
  function updateReviewedIdea(value: string) {
    if (value === idea) return;
    const relevant = new Set(beginnerQuestions(value, language).map(question => question.id));
    setAnswers(values => Object.fromEntries(Object.entries(values).filter(([id]) => relevant.has(id))));
    setCustom(values => Object.fromEntries(Object.entries(values).filter(([id]) => relevant.has(id))));
    if (dailyTaskKind(value) !== dailyTaskKind(idea)) { setRoutine(null); setDetailsApplied(false); setAppliedProgress(""); }
    setIdea(value); setResult(null); setScore(null); setMetric(null); setOutcome(null); setCopied(false); setError("");
  }
  function taskContext(): PromptContext {
    const details = questions.map((q) => answers[q.id]?.trim() ? q.label + ": " + answers[q.id].trim() : "").filter(Boolean);
    if (extra.trim()) details.push(c.extra + ": " + extra.trim());
    if(routine?.kind==="playbook"&&dailyTaskKind(routine.payload.idea)==="study")details.unshift(d.nextSession+". "+d.needsTopic);
    if(appliedProgress)details.push(d.sourceProgress+": "+appliedProgress);
    return { universal: true, category: "auto", delivery, preferences: {answers,extra,language}, clarifications: details.join("\n"), ...(profile ? {profile,profileConsent:true} : {}) };
  }
  async function generate() {
    if (inFlight.current || ideaEditing || !authReady || !canExpandIdea(idea)) return;
    inFlight.current = true; setBusy(true); setError(""); setLimited(false); setWeeklyLimited(false);
    const abort = new AbortController(); controller.current = abort; const timer = setTimeout(() => abort.abort(), 60000);
    try {
      const context = taskContext(); if((context.clarifications?.length??0)>1800){setError(d.detailLimit);return;}
      const response = await fetch(userId ? "/api/prompts/generate" : "/api/guest/generate", { method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal, body: JSON.stringify({ idea, target_tool: "claude", context, outputLanguage: detectTextLanguage(idea, language) }) });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        if (response.status === 401) { signIn(); return; }
        if (json.error === "GUEST_LIMIT_REACHED") { setLimited(true); setError(c.limit); return; }
        if (json.error === "GUEST_BUSY") { setError(c.generatingHelp); return; }
        if (json.upgradeRequired) { setWeeklyLimited(true); setError(c.usageLimit); return; }
        throw new Error();
      }
      const text = userId ? await response.text() : (await response.json()).data;
      if (typeof text !== "string" || !text.trim() || text.length > 16000) throw new Error();
      const next = { idea, text, context }; setResult(next); setScore(null); setQualityOpen(false); setCopied(false); setOutcome(null); setEditing(false); setStep(2);
      const nextMetric = nextTaskMetric(null, true); setMetric(nextMetric); track("prompt_generated", { ...nextMetric, new_task: true }); preserve(next);
    } catch { setError(c.unavailable); } finally { clearTimeout(timer); inFlight.current = false; controller.current = null; setBusy(false); }
  }
  async function copy() {
    if (!result?.text.trim()) { setError(c.empty); return; }
    try { await navigator.clipboard.writeText(result.text); setCopied(true); track("prompt_copied", { ...metric }); } catch { setError(c.copyError); }
  }
  async function save() {
    if (!result?.text.trim() || inFlight.current) return; if (!userId) { signIn(); return; }
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(result.savedId ? "/api/prompts/" + result.savedId : "/api/prompts", { method: result.savedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: result.idea, context: result.context, generated_prompt: result.text, target_tool: "claude", score }) });
      if (response.status === 401) { signIn(); return; } const json = await response.json(); if (!response.ok || !json.data?.id) throw new Error();
      const next = { ...result, savedId: json.data.id, saved: true }; setResult(next); preserve(next); track("prompt_saved");
    } catch { setError(c.saveError); } finally { inFlight.current = false; setBusy(false); }
  }
  async function readScore(text: string) {
    if (!result) throw new Error();
    const response = await fetch("/api/prompts/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: result.idea, generated_prompt: text, target_tool: "claude", universal: true }) });
    const json = await response.json(); if (!response.ok || !json.data || !Array.isArray(json.data.dimensions)) throw new Error(); return json.data as PromptScore;
  }
  async function improve() {
    if (!result || inFlight.current || result.context.delivery === "answer") return; if (!userId) { signIn(); return; }
    inFlight.current = true; setBusy(true); setError(""); setQualityOpen(true); setQualityError(null); let applied = false;
    try {
      const currentScore = score ?? await readScore(result.text); setScore(currentScore);
      const response = await fetch("/api/prompts/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: result.idea, context: result.context, generated_prompt: result.text, target_tool: "claude", score: currentScore, outputLanguage: detectTextLanguage(result.text, language) }) });
      const json = await response.json(); if (json.upgradeRequired) { setWeeklyLimited(true); setError(c.usageLimit); return; }
      const text = json.data?.improved_prompt; if (!response.ok || typeof text !== "string" || !text.trim() || text.length > 16000) throw new Error();
      const next = { ...result, text, saved: false, context: { ...result.context, versions: rememberVersion(result.context.versions, result.text, "Optimized") } };
      setResult(next); preserve(next); setCopied(false); setOutcome(null); setScore(null); applied = true; setMetric(nextTaskMetric(metric, false)); setScore(await readScore(text));
    } catch { if (!applied) setError(c.unavailable); else setQualityError(composerCopy(language).optimizeRescoreError); } finally { inFlight.current = false; setBusy(false); }
  }
  function finishEdit() {
    if (!result || !editText.trim()) { setError(c.empty); return; }
    const next = { ...result, text: editText, saved: false }; setResult(next); preserve(next); setEditing(false); setScore(null); setCopied(false); setOutcome(null); setError(""); setMetric(nextTaskMetric(metric, false));
  }
  function reset() {
    if (!userId) { signIn(); return; }
    setIdea(""); setAnswers({}); setCustom({}); setExtra(""); setResult(null); setStep(0); setScore(null); setError(""); setCopied(false); setEditing(false);setRoutine(null);setProfile(null);setDetailsApplied(false);setAppliedProgress("");router.replace("/builder");
    try { sessionStorage.removeItem(BEGINNER_DRAFT_KEY); } catch {}
  }
  function applySavedDetails(){if(routine?.kind!=="playbook")return;const settings=routine.payload.routine;const previous=beginnerQuestions(routine.payload.idea,settings?.language??language);const current=beginnerQuestions(idea,language);setAnswers(Object.fromEntries(Object.entries(settings?.answers??{}).map(([id,value])=>{const index=previous.find(q=>q.id===id)?.options.indexOf(value)??-1;return[id,index>=0?current.find(q=>q.id===id)?.options[index]??value:value];})));setExtra(settings?.extra??"");setAppliedProgress(settings?.progress??"");setDetailsApplied(true);}
  function nextTask(value:string){if(!result)return;if(!result.saved&&!window.confirm(d.replace))return;setIdea(value);setAnswers({});setCustom({});setExtra("");setResult(null);setStep(1);setScore(null);setProfile(null);setRoutine(null);setDetailsApplied(false);setAppliedProgress("");setCopied(false);setEditing(false);setError("");router.replace("/builder");}
  return <div className="beginner-shell">
    <header className="beginner-header"><Link href="/" aria-label="Umprompt"><Logo size={46} className="beginner-brand" /></Link><nav className="beginner-nav" aria-label={c.language}>
      <label className="beginner-language"><Globe size={17} aria-hidden="true" /><span className="sr-only">{c.language}</span><select aria-label={c.language} value={language} onChange={(e) => setLanguage(e.target.value as AppLanguage)}>{(["en", "ru", "es"] as const).map((lang) => <option key={lang} value={lang}>{languageLabels[lang]}</option>)}</select></label>
      <Link className="beginner-nav-plans" href="/plan?returnTo=%2F%3Fresume%3Dcheckout" onClick={(e) => { if (!preserve()) e.preventDefault(); }}>{c.plans}</Link>{userId ? <Link className="beginner-signin" href="/dashboard">{c.workspace}<ArrowRight size={16} /></Link> : <button className="beginner-signin" onClick={signIn}>{c.signIn}<ArrowRight size={16} /></button>}
    </nav></header>
    <main className="beginner-main">{step > 0 && <ol className="beginner-steps" aria-label={c.eyebrow}>{c.steps.map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined} data-active={step >= i}><span>{step > i ? <Check size={15} /> : i + 1}</span>{label}</li>)}</ol>}
      <div ref={panel} tabIndex={-1} className="beginner-focus" aria-busy={busy || sourceLoading}>
      {sourceLoading && <p role="status">{d.loading}</p>}{sourceError && <div role="alert" className="beginner-error"><p>{d.loadError}</p><button className="beginner-secondary" onClick={()=>{sourceLoaded.current="";setSourceRetry(n=>n+1);}}>{d.retry}</button><Link href="/dashboard">{d.back}</Link></div>}
      {!sourceLoading&&!sourceError&&(sourceId||routineId)&&authReady&&!userId&&<div className="daily-memory"><p>{d.signin}</p><button className="beginner-primary" onClick={signIn}>{c.signIn}</button></div>}
      {!sourceLoading&&!sourceError&&(!(sourceId||routineId)||!!userId)&&<>
      {step === 0 && <><section className="beginner-hero"><div className="beginner-intro"><p className="beginner-eyebrow"><Sparkles size={16} />{c.eyebrow}</p><h1>{c.title}</h1><p className="beginner-subtitle">{c.subtitle}</p>
        <form className="beginner-composer" onSubmit={(e) => { e.preventDefault(); begin(); }}><label htmlFor="beginner-idea">{c.ideaLabel}</label><div className="beginner-idea-field" data-active={!idea && !inputFocused}><textarea onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} id="beginner-idea" maxLength={4000} value={idea} onChange={(e) => { setIdea(e.target.value); setAnswers({}); setCustom({}); setError(""); }} placeholder={c.placeholder} rows={3} /><IdeaPlaceholder key={language} active={!idea && !inputFocused} examples={c.tasks.map((task) => task.idea).filter(Boolean)} pauseLabel={composerCopy(language).pauseExamples} resumeLabel={composerCopy(language).resumeExamples} /></div><p className="beginner-reassurance"><Sparkles size={15} />{c.reassurance}</p><button className="beginner-primary" type="submit" disabled={!canExpandIdea(idea)}>{c.continue}<ArrowRight size={19} /></button></form>
        <div className="beginner-below"><p><ShieldCheck size={15} />{c.free}</p><button type="button" onClick={() => ideas.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })}>{c.browse}<ArrowRight size={15} /></button></div>
      </div><aside className="beginner-preview" aria-label={c.previewLabel}><p className="beginner-preview-label">{c.previewLabel}</p><StudyIllustration /><p className="beginner-preview-from">{c.previewFrom}</p><div className="beginner-preview-line"><ArrowRight size={20} /></div><div className="beginner-preview-to"><span className="beginner-check"><Check size={18} /></span><h2>{c.previewTo}</h2><p>{c.previewDetails}</p></div><button type="button" onClick={() => pick(c.tasks[0].idea)}>{c.useIdea}<ArrowRight size={17} /></button><small>{c.previewNote}</small></aside></section>
        <section ref={ideas} className="beginner-ideas"><div className="beginner-section-heading"><div><h2>{c.ideasTitle}</h2><p>{c.ideasSubtitle}</p></div><Sparkles size={23} aria-hidden="true" /></div><div className="beginner-task-grid">{c.tasks.map((task, i) => { const Icon = icons[i]; return <button type="button" className={"beginner-task beginner-task-" + i} key={task.id} onClick={() => pick(task.idea)}><span className="beginner-task-icon"><Icon size={23} /></span><h3>{task.title}</h3><p>{task.description}</p><span className="beginner-task-arrow"><ArrowRight size={18} /></span></button>; })}</div></section>
        <LandingGuide language={language} onStart={() => { document.getElementById("beginner-idea")?.focus(); document.getElementById("beginner-idea")?.scrollIntoView({ behavior: "auto", block: "center" }); }} />
      </>}
      {step === 1 && <section className="beginner-panel"><button className="beginner-back" disabled={busy} onClick={() => { setIdeaEditing(false); setStep(0); }}><ArrowLeft size={17} />{c.back}</button><h1>{c.detailsTitle}</h1><p className="beginner-panel-subtitle">{c.detailsSubtitle}</p><IdeaReview value={idea} language={language} disabled={busy} editing={ideaEditing} onEditingChange={setIdeaEditing} onCommit={updateReviewedIdea} />
        {routine && <SavedTaskDetails key={routine.id+language} item={routine} applied={detailsApplied} onApply={applySavedDetails} onSaved={item=>{setRoutine(item);setDetailsApplied(false);setAppliedProgress("");}} />}
        <form onSubmit={(e) => { e.preventDefault(); void generate(); }}><div className="beginner-question-grid">{questions.map((q) => <fieldset key={q.id} disabled={busy}><legend>{q.label}</legend>{q.help && <p className="beginner-question-help">{q.help}</p>}<select aria-label={q.label} value={custom[q.id] || (answers[q.id] && !q.options.includes(answers[q.id])) ? "__custom" : answers[q.id] ?? ""} onChange={(e) => { const own = e.target.value === "__custom"; setCustom({ ...custom, [q.id]: own }); setAnswers({ ...answers, [q.id]: own ? "" : e.target.value }); }}><option value="">{c.chooseOption}</option>{q.options.map((option) => <option key={option} value={option}>{option}</option>)}<option value="__custom">{c.custom}</option></select>{(custom[q.id] || (answers[q.id] && !q.options.includes(answers[q.id]))) && <input aria-label={c.customLabel + ": " + q.label} maxLength={600} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} autoFocus />}</fieldset>)}</div>
          <label className="beginner-extra">{c.extra}<textarea disabled={busy} value={extra} maxLength={1200} onChange={(e) => setExtra(e.target.value)} placeholder={c.extraPlaceholder} rows={3} /></label>{userId && <ProfileChooser initialId={profileChoiceId} applied={profile} onApply={setProfile}/>}<fieldset className="beginner-delivery" disabled={busy}><legend>{c.choose}</legend><div>{(["prompt", "answer"] as const).map((mode) => <label key={mode} data-selected={delivery === mode}><input type="radio" name="delivery" checked={delivery === mode} onChange={() => setDelivery(mode)} /><span><strong>{mode === "prompt" ? c.prompt : c.answer}</strong><small>{mode === "prompt" ? c.promptHelp : c.answerHelp}</small></span></label>)}</div></fieldset>
          <button type="submit" className="beginner-primary" disabled={busy || ideaEditing || !authReady}>{busy ? <Loader2 className="animate-spin" size={19} /> : <Sparkles size={19} />}{busy ? c.generating : delivery === "answer" ? c.answer : c.generate}{!busy && <ArrowRight size={18} />}</button>{busy && <p role="status" className="beginner-loading">{c.generatingHelp}</p>}<p className="beginner-provider">{c.providerNote}</p></form>
      </section>}
      {step === 2 && result && <section className="beginner-panel beginner-result"><div className="beginner-original"><span>{c.yourIdea}</span><button disabled={busy} onClick={() => { setEditing(false); setStep(0); setError(""); }}><PenLine size={15} />{c.editIdea}</button><p>{result.idea}</p></div><div className="beginner-result-heading"><span className="beginner-check"><Check size={20} /></span><div><h1>{result.context.delivery === "answer" ? c.answerTitle : c.resultTitle}</h1><p>{result.context.delivery === "answer" ? c.answerResultHelp : c.resultHelp}</p></div></div>
        {result.context.delivery !== "answer" && <button className="beginner-improve" disabled={busy} onClick={() => void improve()}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}{c.improve}</button>}<div className="beginner-output-top"><span>{result.context.delivery === "answer" ? c.steps[2] : c.prompt}</span><button disabled={busy} onClick={() => { setEditText(result.text); setEditing(true); setError(""); }}><PenLine size={15} />{c.edit}</button></div>{editing ? <div className="beginner-editing"><textarea aria-label={c.edit} value={editText} maxLength={16000} rows={15} onChange={(e) => setEditText(e.target.value)} /><div><button className="beginner-secondary" onClick={() => { setEditing(false); setError(""); }}>{c.cancel}</button><button className="beginner-primary" disabled={!editText.trim()} onClick={finishEdit}>{c.done}<Check size={16} /></button></div></div> : <div className="beginner-output" tabIndex={0}><PromptRenderer text={result.text} /></div>}
        {!editing && <><div className="beginner-result-actions"><button className="beginner-primary" onClick={() => void copy()}>{copied ? <Check size={19} /> : <Copy size={19} />}{copied ? c.copied : result.context.delivery === "answer" ? c.copyAnswer : c.copy}</button><button className="beginner-secondary" disabled={busy || result.saved} onClick={() => void save()}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{result.saved ? c.saved : userId ? c.save : c.signInSave}</button></div>
          {result.context.delivery !== "answer" && <><div className="beginner-handoff"><h2>{c.handoffTitle}</h2><ol>{c.handoff.map((line, i) => <li key={line}><span>{i + 1}</span>{line}</li>)}</ol></div>{qualityOpen && <ScorePanel score={score} isScoring={busy} error={qualityError} onRetry={async () => { if (inFlight.current) return; inFlight.current = true; setBusy(true); try { setScore(await readScore(result.text)); setQualityError(null); } catch { setQualityError(composerCopy(language).optimizeScoreError); } finally { inFlight.current = false; setBusy(false); } }} onOptimize={() => void improve()} isOptimizing={busy} />}</>}
          {userId && <DailyResultTools key={result.savedId??result.idea} idea={result.idea} answers={result.context.preferences?.answers??answers} extra={result.context.preferences?.extra??extra} context={result.context} routine={routine} onSaved={setRoutine} onNext={nextTask} disabled={busy} />}
          {copied && metric && <OutcomeFeedback key={metric.result_id} value={outcome} question={result.context.delivery === "answer" ? ({ en: "Was this result useful?", ru: "Результат оказался полезным?", es: "¿Te resultó útil?" })[language] : undefined} onFeedback={(value) => { track("answer_outcome_feedback", { ...metric, outcome: value }); if (value !== "not_tried") { setOutcome(value === "useful"); if (value === "useful") track("prompt_result_confirmed", { ...metric, outcome: value }); } }} />}{!userId && <aside className="beginner-signup"><h2>{c.signupTitle}</h2><p>{c.signup}</p><button className="beginner-secondary" onClick={signIn}>{c.signIn}<ArrowRight size={17} /></button></aside>}<button className="beginner-back beginner-new" disabled={busy} onClick={reset}>{c.next}<ArrowRight size={17} /></button></>}
      </section>}
      {error && <div role="alert" className="beginner-error"><p>{error}</p>{limited && <button className="beginner-secondary" onClick={signIn}>{c.signIn}<ArrowRight size={17} /></button>}{weeklyLimited && <Link className="beginner-secondary" href="/plan?returnTo=%2F%3Fresume%3Dcheckout" onClick={(e) => { if (!preserve()) e.preventDefault(); }}>{c.plans}<ArrowRight size={17} /></Link>}</div>}
      </>}
      </div></main><footer className="beginner-footer"><p>{c.footer}</p><nav><Link href="/help">{c.help}</Link><Link href="/privacy">{c.privacy}</Link><Link href="/terms">{c.terms}</Link></nav></footer>
  </div>;
}
function StudyIllustration() {
  return <svg className="beginner-illustration" viewBox="0 0 340 216" fill="none" aria-hidden="true"><ellipse cx="173" cy="186" rx="130" ry="14" fill="#DCE5D7" /><circle cx="171" cy="100" r="83" fill="#EAF0DE" /><path d="M51 173C39 157 36 129 43 119C62 128 61 154 51 173Z" fill="#8DA888"/><path d="M53 171C60 146 75 138 82 140C82 158 65 171 53 171Z" fill="#B3C7A5"/><path d="M42 173H68L64 190H47L42 173Z" fill="#D6B995"/><rect x="97" y="40" width="141" height="145" rx="15" fill="#FDFCF7" stroke="#B2C4AD" strokeWidth="2" transform="rotate(-6 97 40)"/><rect x="118" y="29" width="71" height="22" rx="7" fill="#54785D" transform="rotate(-6 118 29)"/><path d="M119 77L126 83L138 68M123 108L130 114L142 99M127 139L134 145L146 130" stroke="#54785D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M153 73L207 67M157 105L211 99M161 137L204 133" stroke="#D0DBCA" strokeWidth="6" strokeLinecap="round"/><path d="M198 160C211 151 229 152 242 163V191C229 180 211 179 198 187V160Z" fill="#F3D5B4" stroke="#C39D76" strokeWidth="2"/><path d="M242 163C255 152 275 151 288 160V187C275 179 255 180 242 191V163Z" fill="#FFF0DA" stroke="#C39D76" strokeWidth="2"/><path d="M261 56L265 45L269 56L280 60L269 64L265 75L261 64L250 60L261 56Z" fill="#D9A06E"/><circle cx="76" cy="83" r="5" fill="#CFD8BE"/><path d="M282 111V123M276 117H288" stroke="#9AAB86" strokeWidth="3" strokeLinecap="round"/></svg>;
}
