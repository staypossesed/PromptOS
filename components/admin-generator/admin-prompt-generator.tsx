"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Loader2, RefreshCw, ShieldCheck, Sparkles, Square, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canUseAdminGenerator } from "@/lib/admin-generator/access";
import { GENERATOR_ERRORS, type GeneratorErrorCode } from "@/lib/admin-generator/errors";
import { parseGeneratorInput, type GeneratorFormat, type GeneratorModel } from "@/lib/admin-generator/input";
import type { GeneratorConfiguration } from "@/lib/admin-generator/provider";

const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60";
type Result = { prompt: string; provider: string; model: string };
type Connection = { model: GeneratorModel; modelId: string; checkedAt: string };

export function AdminPromptGenerator({ ownerId, initialConfiguration }: { ownerId: string; initialConfiguration: GeneratorConfiguration }) {
  const router = useRouter();
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [model, setModel] = useState<GeneratorModel>("configured");
  const [format, setFormat] = useState<GeneratorFormat>("general");
  const [language, setLanguage] = useState<"en" | "ru" | "es">("en");
  const [idea, setIdea] = useState("");
  const [constraints, setConstraints] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState<"generate" | "check" | "configuration" | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const revision = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const selected = configuration.models.find(option => option.value === model);
  const available = !!selected?.configured && !accessDenied;

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    function checkUser(user: Parameters<typeof canUseAdminGenerator>[0]) {
      if (!active) return;
      if (user?.id === ownerId && canUseAdminGenerator(user)) { setAccessDenied(false); return; }
      revision.current += 1; controller.current?.abort(); lock.current = false;
      setIdea(""); setConstraints(""); setResult(null); setConnection(null); setBusy(null); setAccessDenied(true);
      router.replace(user ? "/dashboard" : "/login?next=%2Fadmin-generator");
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event !== "INITIAL_SESSION") checkUser(session?.user); });
    void supabase.auth.getUser().then(({ data }) => checkUser(data.user)).catch(() => { if (active) setAccessDenied(true); });
    return () => { active = false; revision.current += 1; controller.current?.abort(); listener.subscription.unsubscribe(); };
  }, [ownerId, router]);

  async function run(action: "generate" | "check") {
    if (lock.current || !available) return;
    const input = action === "check" ? { action, model } : { action, model, idea, constraints, format, language, negativePrompt };
    if (!parseGeneratorInput(input)) { setError("Enter at least three characters and check your generator settings."); return; }
    const version = ++revision.current;
    const selectedModel = model;
    const abort = new AbortController(); controller.current = abort; lock.current = true;
    const timer = setTimeout(() => abort.abort(new DOMException("The provider took too long to respond.", "TimeoutError")), action === "check" ? 25000 : 55000);
    setBusy(action); setError(""); setCopied(false);
    if (action === "check") setConnection(null);
    try {
      const response = await fetch("/api/admin-generator", {
        method: "POST", credentials: "same-origin", cache: "no-store", signal: abort.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));
      if (version !== revision.current) return;
      if (abort.signal.aborted) throw abort.signal.reason;
      if (!response.ok) {
        if (data.error === "UNAUTHENTICATED" || data.error === "FORBIDDEN") setAccessDenied(true);
        const message = typeof data.error === "string" && Object.prototype.hasOwnProperty.call(GENERATOR_ERRORS, data.error) ? GENERATOR_ERRORS[data.error as GeneratorErrorCode] : GENERATOR_ERRORS.GENERATOR_UNAVAILABLE;
        throw new Error(message);
      }
      if (action === "check") {
        if (data.ok !== true || typeof data.model !== "string" || typeof data.checkedAt !== "string") throw new Error("The connection check returned an incomplete response.");
        setConnection({ model: selectedModel, modelId: data.model, checkedAt: data.checkedAt });
      } else {
        if (typeof data.prompt !== "string" || !data.prompt.trim() || data.prompt.length > 16000 || typeof data.model !== "string" || typeof data.provider !== "string") throw new Error("The provider returned an incomplete response. Your previous prompt is unchanged.");
        setResult({ prompt: data.prompt, model: data.model, provider: data.provider });
      }
    } catch (error) {
      if (version === revision.current) {
        setError(abort.signal.aborted ? abort.signal.reason?.name === "TimeoutError" ? GENERATOR_ERRORS.PROVIDER_TIMEOUT : "Stopped. Your draft and previous prompt are still here." : error instanceof Error ? error.message : GENERATOR_ERRORS.GENERATOR_UNAVAILABLE);
      }
    } finally {
      clearTimeout(timer);
      if (version === revision.current) { controller.current = null; lock.current = false; setBusy(null); }
    }
  }
  async function refreshConfiguration() {
    if (lock.current || accessDenied) return;
    const version = ++revision.current;
    const abort = new AbortController(); controller.current = abort; lock.current = true; setBusy("configuration"); setError("");
    const timer = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch("/api/admin-generator", { credentials: "same-origin", cache: "no-store", signal: abort.signal });
      const data = await response.json();
      if (version !== revision.current) return;
      if (abort.signal.aborted || !response.ok || !Array.isArray(data.models) || !data.models.every((item: {value?: unknown;configured?: unknown}) => (item.value === "venice" || item.value === "configured") && typeof item.configured === "boolean")) throw new Error();
      setConfiguration(data); setConnection(null);
    } catch { if (version === revision.current) setError("Could not refresh model configuration. Your draft and previous prompt are unchanged."); }
    finally { clearTimeout(timer); if (version === revision.current) { lock.current = false; controller.current = null; setBusy(null); } }
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.prompt); setCopied(true); }
    catch { setError("Copying did not work. Select the prompt text below and copy it manually."); }
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.prompt], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "umprompt-private-prompt.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="min-h-screen bg-paper text-ink-900">
    <header className="border-b border-ink-100 bg-white px-4 py-4 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
      <Link href="/dashboard" className="text-sm font-medium text-emerald-800 hover:underline">← Back to workspace</Link>
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"><ShieldCheck size={15} />Private admin access</span>
    </div></header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">Your private workspace</p><h1 className="font-serif text-3xl font-medium">Private prompt generator</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">Describe what you want. Generate a prompt for text, images, writing or code, then copy it into your chosen tool.</p></div>
      <p className="mb-6 text-sm text-emerald-800">No Umprompt generation quota for this account. Provider usage is billed separately.</p>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-label="Prompt settings">
          <form className="space-y-5" onSubmit={event => { event.preventDefault(); void run("generate"); }}>
            <label className="block text-sm font-medium">Model<select className={field + " mt-2"} value={model} disabled={!!busy || accessDenied} onChange={event => { setModel(event.target.value as GeneratorModel); setConnection(null); setError(""); }}>
              {configuration.models.map(option => <option key={option.value} value={option.value}>{option.name} · {option.provider}{option.configured ? "" : " · API key required"}</option>)}
            </select></label>
            <div className="rounded-xl bg-cream-50 p-3 text-xs leading-relaxed text-ink-500">
              {model === "venice" ? <p>Uses the Venice Uncensored model through OpenRouter. No extra Umprompt content-screening step is applied. Model and provider restrictions or refusals can still occur.</p> : <p>Uses the app’s configured default model. Its normal provider restrictions apply; it is not silently substituted for Venice.</p>}
              <p className="mt-2 break-all">Model ID: {selected?.modelId || "Not configured"}</p>
            </div>
            {!selected?.configured && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{model === "venice" ? "Configure OPENROUTER_API_KEY in the server environment to use Venice. No key is requested or stored in this page." : GENERATOR_ERRORS.MISSING_PROVIDER_KEY}</div>}
            <div className="flex flex-wrap gap-2"><button className={secondary} type="button" disabled={!!busy || !available} onClick={() => void run("check")}>{busy === "check" ? <Loader2 className="animate-spin" size={16} /> : <Wifi size={16} />}Check API connection</button><button className={secondary} type="button" disabled={!!busy || accessDenied} onClick={() => void refreshConfiguration()} aria-label="Refresh model configuration"><RefreshCw size={16} />Refresh configuration</button></div>
            <p role="status" className="text-xs text-ink-500">{connection?.model === model ? "Last successful API check: " + new Date(connection.checkedAt).toLocaleString() : "Live API connection has not been checked for this model in this tab."} The connection check sends a tiny test request to the provider.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Prompt type<select className={field + " mt-2"} value={format} disabled={!!busy || accessDenied} onChange={event => setFormat(event.target.value as GeneratorFormat)}><option value="general">General</option><option value="image">Image</option><option value="writing">Writing</option><option value="coding">Coding</option></select></label>
              <label className="block text-sm font-medium">Output language<select className={field + " mt-2"} value={language} disabled={!!busy || accessDenied} onChange={event => setLanguage(event.target.value as "en" | "ru" | "es")}><option value="en">English</option><option value="ru">Russian</option><option value="es">Spanish</option></select></label>
            </div>
            <label className="block text-sm font-medium">What prompt do you want?<textarea className={field + " mt-2 min-h-40"} maxLength={6000} required minLength={3} value={idea} disabled={!!busy || accessDenied} onChange={event => setIdea(event.target.value)} placeholder="Describe your subject, intended result, style and details to preserve." /></label>
            <label className="block text-sm font-medium">Additional constraints <span className="font-normal text-ink-400">(optional)</span><textarea className={field + " mt-2"} rows={3} maxLength={2000} value={constraints} disabled={!!busy || accessDenied} onChange={event => setConstraints(event.target.value)} placeholder="Specific wording, length, composition, format or things to avoid." /></label>
            {format === "image" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={negativePrompt} disabled={!!busy || accessDenied} onChange={event => setNegativePrompt(event.target.checked)} />Include a negative-prompt section</label>}
            <div className="flex flex-wrap gap-3"><button className={primary} type="submit" disabled={!!busy || !available || idea.trim().length < 3}>{busy === "generate" ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}{busy === "generate" ? "Generating your prompt…" : "Generate prompt"}</button>{busy && <button className={secondary} type="button" onClick={() => controller.current?.abort()}><Square size={14} />Stop</button>}</div>
            {busy && <p role="status" className="text-sm text-emerald-800">{busy === "check" ? "Checking the selected provider and model…" : busy === "configuration" ? "Refreshing server configuration…" : "The provider is preparing your prompt. Your previous result stays available."}</p>}
          </form>
          {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{error}</p>{accessDenied && <Link href="/login?next=%2Fadmin-generator" className="mt-2 inline-block underline">Sign in again</Link>}</div>}
        </section>
        <section className="min-w-0 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-label="Generated prompt">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl">Your prompt</h2><div className="flex gap-2"><button className={secondary} type="button" disabled={!result} onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy"}</button><button className={secondary} type="button" disabled={!result} onClick={download}><Download size={16} />Download</button></div></div>
          {result ? <><pre tabIndex={0} className="min-h-64 whitespace-pre-wrap break-words rounded-xl bg-cream-50 p-4 font-sans text-sm leading-relaxed">{result.prompt}</pre><p className="mt-3 break-all text-xs text-ink-400">{result.provider} · {result.model}</p></> : <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 p-6 text-center text-ink-400"><Sparkles className="mb-3" size={26} /><p className="text-sm">Your generated prompt will appear here.</p><p className="mt-2 text-xs">API errors and provider refusals appear separately and never become a prompt.</p></div>}
          <p role="status" className="mt-3 text-xs text-emerald-800">{copied ? "Prompt copied to your clipboard." : ""}</p>
          <p className="mt-5 text-xs leading-relaxed text-ink-400">Prompts are sent to the selected provider only when you submit. This feature does not save them to your history. Refreshing or leaving clears this tab’s draft and result.</p>
        </section>
      </div>
    </main>
  </div>;
}
