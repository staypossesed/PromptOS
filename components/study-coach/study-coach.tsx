"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Copy, Loader2, Send, ShieldCheck, Square, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canUseStudyCoach } from "@/lib/study-coach/access";
import { CHECKPOINT_REQUEST, STUDY_COACH_OPENING, extractStudyCheckpoint, studySessionNearLimit, validateStudyRequest, type StudyIntent, type StudyMessage } from "@/lib/study-coach/course";
import { PromptRenderer } from "@/components/builder/prompt-output";

type Attempt = { content: string; intent: StudyIntent; history: StudyMessage[] };
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60";

export function StudyCoach({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [mode, setMode] = useState<"new" | "resume">("new");
  const [topic, setTopic] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [minutes, setMinutes] = useState(30);
  const [resumeText, setResumeText] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingTurn, setPendingTurn] = useState("");
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const lastAttempt = useRef<Attempt | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const checkpoint = [...messages].reverse().filter(message => message.role === "assistant").map(message => extractStudyCheckpoint(message.content)).find(Boolean) ?? null;
  const nearLimit = studySessionNearLimit(messages, draft);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    function check(user: Parameters<typeof canUseStudyCoach>[0]) {
      if (!active) return;
      if (user?.id === ownerId && canUseStudyCoach(user)) { setAccessDenied(false); return; }
      revision.current += 1; controller.current?.abort(); inFlight.current = false; lastAttempt.current = null;
      setMessages([]); setResumeText(""); setDraft(""); setTopic(""); setPendingTurn(""); setBusy(false); setEnded(false); setAccessDenied(true);
      router.replace(user ? "/dashboard" : "/login?next=%2Fstudy-coach");
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event !== "INITIAL_SESSION") check(session?.user); });
    void supabase.auth.getUser().then(({ data }) => check(data.user)).catch(() => { if (active) setAccessDenied(true); });
    return () => { active = false; revision.current += 1; controller.current?.abort(); listener.subscription.unsubscribe(); };
  }, [ownerId, router]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }, [messages.length, busy]);
  useEffect(() => { setCopyStatus(""); }, [checkpoint]);

  async function ask(content: string, intent: StudyIntent = "lesson", history = messages) {
    if (inFlight.current || accessDenied || !content.trim()) return;
    if (intent === "lesson" && studySessionNearLimit(history, content)) { setError("This session is getting long. End it and copy a Progress Checkpoint before continuing in a new session."); return; }
    const outgoing: StudyMessage[] = [...history, { role: "user", content }];
    if (!validateStudyRequest({ messages: outgoing, intent })) { setError("This session is too long to send. Copy an existing Progress Checkpoint and begin a new session."); return; }
    const attempt = { content, intent, history }; lastAttempt.current = attempt;
    const version = ++revision.current;
    const abort = new AbortController(); controller.current = abort; inFlight.current = true;
    const timer = setTimeout(() => abort.abort(new DOMException("The coach took too long to respond.", "TimeoutError")), 55000);
    setBusy(true); setPendingTurn(content); setError("");
    try {
      const response = await fetch("/api/study-coach", {
        method: "POST", credentials: "same-origin", cache: "no-store", signal: abort.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: outgoing, intent }),
      });
      const data = await response.json().catch(() => ({}));
      if (version !== revision.current) return;
      if (abort.signal.aborted) throw abort.signal.reason;
      if (!response.ok) {
        if (response.status === 401) { setAccessDenied(true); throw new Error("Your sign-in expired. Copy any existing checkpoint before signing in again."); }
        if (response.status === 403) { setAccessDenied(true); throw new Error("This private feature is not available for this account."); }
        if (response.status === 429) throw new Error("The study coach has reached its request limit. Your conversation is still here; try again later.");
        if (data.error === "CHECKPOINT_UNAVAILABLE") throw new Error("The coach could not prepare a complete checkpoint. Your conversation is still here; try ending the session again.");
        throw new Error("The coach could not respond this time. Your conversation and unsent answer are still here. Please try again.");
      }
      if (typeof data.message !== "string" || !data.message.trim() || data.message.length > 12000) throw new Error("The coach returned an incomplete response. Please try again.");
      if (intent === "checkpoint" && !extractStudyCheckpoint(data.message)) throw new Error("The checkpoint was incomplete. Please try again.");
      setMessages([...outgoing, { role: "assistant", content: data.message }]);
      setDraft(""); setEnded(intent === "checkpoint"); lastAttempt.current = null;
    } catch (error) {
      if (version === revision.current) setError(abort.signal.aborted && abort.signal.reason?.name !== "TimeoutError" ? "Stopped. Your conversation and unsent answer are still here." : error instanceof Error ? error.message : "The coach is unavailable. Please try again.");
    } finally {
      clearTimeout(timer);
      if (version === revision.current) { controller.current = null; inFlight.current = false; setBusy(false); setPendingTurn(""); }
    }
  }

  function startCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!topic.trim() || !Number.isInteger(weeks) || weeks < 2 || weeks > 52 || !Number.isInteger(minutes) || minutes < 1 || minutes > 240) return;
    void ask(`I want to study ${topic.trim()}. The course should last ${weeks} weeks, with ${minutes} minutes per session. Start with the 3–5 question diagnostic and wait for my answers.`);
  }
  function resumeCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!extractStudyCheckpoint(resumeText)) { setError("Paste a complete Progress Checkpoint, including its heading and all fields."); return; }
    void ask("Resume my course using this learner-supplied Progress Checkpoint. Continue from its next step, without assuming other saved history:\n\n" + resumeText.trim());
  }
  function newSession() {
    if (inFlight.current || (messages.length && !window.confirm("Start a new session? This conversation will be cleared. Copy a Progress Checkpoint first if you want to resume."))) return;
    revision.current += 1; lastAttempt.current = null; setMessages([]); setTopic(""); setResumeText(""); setDraft(""); setError(""); setEnded(false); setCopyStatus(""); setMode("new");
  }
  async function copyCheckpoint() {
    if (!checkpoint) return;
    try { await navigator.clipboard.writeText(checkpoint); setCopyStatus("Checkpoint copied. Paste it into a new session to resume."); }
    catch { setCopyStatus("Copying did not work. Select the checkpoint text below and copy it manually."); }
  }

  return <div className="min-h-screen bg-paper text-ink-900">
    <header className="border-b border-ink-100 bg-white px-4 py-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-medium text-emerald-800 hover:underline">← Back to workspace</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"><ShieldCheck size={15} />Private admin feature</span>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">A course at your pace</p><h1 className="font-serif text-3xl font-medium">Your study coach</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">One topic. One focused lesson at a time. Practice before moving on, with reviews where you need them.</p></div>
        <button type="button" className={secondary} disabled={busy || !messages.length} onClick={newSession}><RotateCcw size={16} />New session</button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Study conversation" className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4 sm:p-6">
          {!messages.length && <>
            <div className="mb-6 flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><BookOpen size={21} /></span><p className="whitespace-pre-wrap text-sm leading-relaxed">{STUDY_COACH_OPENING}</p></div>
            <div className="mb-5 flex flex-wrap gap-2" aria-label="Course setup">
              <button type="button" className={mode === "new" ? primary : secondary} aria-pressed={mode === "new"} disabled={busy} onClick={() => { setMode("new"); setError(""); }}>Start a course</button>
              <button type="button" className={mode === "resume" ? primary : secondary} aria-pressed={mode === "resume"} disabled={busy} onClick={() => { setMode("resume"); setError(""); }}>Resume from a checkpoint</button>
            </div>
            {mode === "new" ? <form onSubmit={startCourse} className="space-y-4">
              <label className="block text-sm font-medium">Subject or skill<input className={inputClass + " mt-2"} value={topic} onChange={event => setTopic(event.target.value)} maxLength={300} placeholder="For example: Python fundamentals" required disabled={busy || accessDenied} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Course length in weeks<input className={inputClass + " mt-2"} type="number" min={2} max={52} step={1} value={weeks} onChange={event => setWeeks(Number(event.target.value))} required disabled={busy || accessDenied} /></label>
                <label className="block text-sm font-medium">Minutes per session<input className={inputClass + " mt-2"} type="number" min={1} max={240} step={1} value={minutes} onChange={event => setMinutes(Number(event.target.value))} required disabled={busy || accessDenied} /></label>
              </div>
              <button className={primary} type="submit" disabled={busy || accessDenied || !topic.trim()}>{busy ? <Loader2 className="animate-spin" size={17} /> : <BookOpen size={17} />}Start my diagnostic</button>
            </form> : <form onSubmit={resumeCourse} className="space-y-4">
              <label className="block text-sm font-medium">Paste your Progress Checkpoint<textarea className={inputClass + " mt-2 min-h-56"} value={resumeText} onChange={event => setResumeText(event.target.value)} maxLength={12000} required disabled={busy || accessDenied} placeholder={"## Progress Checkpoint\nTopic: …\nCourse length: …\nTime per session: …\nCurrent lesson number: …\nLessons completed: …\nWeak areas identified: …\nNext step: …\nPending exercise or diagnostic: …"} /></label>
              <button className={primary} type="submit" disabled={busy || accessDenied || !resumeText.trim()}>Resume my course</button>
            </form>}
          </>}
          <div role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" className="space-y-5">
            {messages.map((message, index) => <article key={index} className={message.role === "user" ? "rounded-xl bg-cream-50 p-4" : "rounded-xl border border-emerald-100 p-4"}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">{message.role === "user" ? "You" : "Study coach"}</p>
              <div className="break-words text-sm leading-relaxed">{message.role === "assistant" ? <PromptRenderer text={message.content} /> : <p className="whitespace-pre-wrap">{message.content}</p>}</div>
            </article>)}
            {busy && <article className="mt-5 rounded-xl bg-cream-50 p-4"><p className="mb-3 whitespace-pre-wrap break-words text-sm">{pendingTurn}</p><p role="status" className="flex items-center gap-2 text-sm text-emerald-800"><Loader2 size={17} className="animate-spin" />The coach is preparing your next step…</p><button type="button" className={secondary + " mt-3"} onClick={() => controller.current?.abort()}><Square size={14} />Stop</button></article>}
            <div ref={bottom} />
          </div>
          {!!messages.length && !ended && <form className="mt-6 space-y-3 border-t border-ink-100 pt-5" onSubmit={event => { event.preventDefault(); void ask(draft.trim()); }}>
            <label htmlFor="study-answer" className="block text-sm font-medium">Your answer or question</label>
            <textarea id="study-answer" className={inputClass} rows={4} value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} disabled={busy || accessDenied} placeholder="Answer the diagnostic or practice exercise, or ask for an explanation." />
            {nearLimit && <p className="text-sm text-amber-800">This session is getting long. End it and copy a Progress Checkpoint to continue in a new session.</p>}
            <div className="flex flex-wrap gap-3"><button className={primary} type="submit" disabled={busy || accessDenied || nearLimit || !draft.trim()}><Send size={16} />Send answer</button><button className={secondary} type="button" disabled={busy || accessDenied || !!draft.trim()} onClick={() => void ask(CHECKPOINT_REQUEST, "checkpoint")}>End session &amp; make checkpoint</button></div>
            {!!draft.trim() && <p className="text-xs text-ink-400">Send or clear your draft before ending the session.</p>}
          </form>}
          {ended && <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><Check className="mr-2 inline" size={17} />Session ended. Copy your checkpoint before leaving. Use New session and paste it to resume.</div>}
          {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{error}</p>{lastAttempt.current && !busy && !accessDenied && <button type="button" className={secondary + " mt-3"} onClick={() => { const attempt = lastAttempt.current; if (attempt) void ask(attempt.content, attempt.intent, attempt.history); }}>Try again</button>}{accessDenied && <Link href="/login?next=%2Fstudy-coach" className="mt-3 inline-block underline">Sign in again</Link>}</div>}
        </section>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-ink-100 bg-white p-5"><h2 className="font-serif text-lg">Your Progress Checkpoint</h2><p className="mt-2 text-sm leading-relaxed text-ink-500">There is no memory between conversations. Copy a checkpoint at the end of each session and paste it into the next one.</p>
            {checkpoint ? <><textarea aria-label="Progress Checkpoint" className={inputClass + " mt-4 font-mono text-xs"} rows={13} readOnly value={checkpoint} /><button type="button" className={primary + " mt-3 w-full"} onClick={() => void copyCheckpoint()}><Copy size={16} />Copy Progress Checkpoint</button><p role="status" className="mt-2 text-xs leading-relaxed text-emerald-800">{copyStatus}</p></> : <p className="mt-4 rounded-xl bg-cream-50 p-3 text-sm text-ink-500">Your checkpoint will appear here when you end a session.</p>}
          </section>
          <section className="rounded-2xl border border-ink-100 bg-cream-50 p-5 text-sm leading-relaxed text-ink-600"><h2 className="mb-2 font-medium text-ink-900">How it works</h2><ul className="list-disc space-y-2 pl-4"><li>Start with 3–5 diagnostic questions.</li><li>Learn one concept, then try an exercise.</li><li>Get feedback after answering.</li><li>Review weak areas every 3–4 lessons.</li></ul></section>
          <p className="px-1 text-xs leading-relaxed text-ink-400">Umprompt does not save this chat or course progress. Refreshing or leaving clears the conversation. Messages are sent to Umprompt’s configured AI provider when you submit them. There are no automatic reminders.</p>
        </aside>
      </div>
    </main>
  </div>;
}
