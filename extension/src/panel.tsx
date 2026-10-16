import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, BookOpen, Check, Copy, ExternalLink, Github, History, LogOut, PenLine, Plus, RefreshCw, Save, Sparkles, Undo2, WandSparkles, X } from "lucide-react";
import { composerCopy } from "../../lib/composer-copy";
import { TASK_CATEGORIES } from "../../lib/task-categories";
import { getStarterSuggestions, getSuggestions, hashSeed } from "../../lib/idea-suggestions";
import { detectTextLanguage } from "../../lib/i18n/detect-text-language";
import { getDictionary } from "../../lib/i18n/dictionaries";
import type { AppLanguage } from "../../types/language";
import type { PromptSummary } from "../../types/prompt";
import { extensionCopy } from "./copy";
import { acceptResult, background, draftBody, draftKey, draftScore, emptyDraft, fingerprint, inputFingerprint, isCurrent, isSaved, restoreDraft, withScore, type Draft, type ExtensionUser } from "./core";
import { api, ApiError, checkBackend, readJson, readPrompt } from "./api";
import { siteOrigin } from "./config";
import { AuthFlowError, type AuthFailure } from "./auth-flow";
import { canExpandIdea, editPromptText, MAX_PROMPT_LENGTH } from "../../lib/prompt-editing";
import "./panel.css";

function Panel() {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [user, setUser] = useState<ExtensionUser | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState("");
  const [view, setView] = useState<"prompt" | "history">("prompt");
  const [editingIdea, setEditingIdea] = useState(false);
  const [requestStarted, setRequestStarted] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [editingResult, setEditingResult] = useState(false);
  const [stream, setStream] = useState("");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [backendChecking, setBackendChecking] = useState(true);
  const [backendError, setBackendError] = useState<ApiError["reason"] | null>(null);
  const [notice, setNotice] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [history, setHistory] = useState<PromptSummary[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [usage, setUsage] = useState<{ isPaid: boolean; remainingThisWeek: number | null } | null>(null);
  const [callback, setCallback] = useState("");
  const [authHelp, setAuthHelp] = useState(false);
  const [authFailure, setAuthFailure] = useState<AuthFailure | null>(null);
  const [suggestionSeed, setSuggestionSeed] = useState(() => hashSeed(String(Date.now())));
  const owner = useRef<ExtensionUser | null>(null);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const healthController = useRef<AbortController | null>(null);
  const lastHealthCheck = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const ideaInput = useRef<HTMLTextAreaElement>(null);
  const resultInput = useRef<HTMLTextAreaElement>(null);
  const manualEdit = useRef(false);
  const ideaEdit = useRef<Draft | null>(null);
  const c = composerCopy(language);
  const t = extensionCopy(language);
  const scoreCopy = getDictionary(language).score;
  const disabled = !ready || !!busy;
  const current = isCurrent(draft);
  const hasResult = canExpandIdea(draft.idea) && draft.resultInput === inputFingerprint(draft);
  const score = draftScore(draft);
  const showResult = (!editingIdea && hasResult) || !!stream;
  const suggestions = !draft.idea.trim() && draft.category === "auto" ? getStarterSuggestions(suggestionSeed, language).slice(0, 3) : getSuggestions(draft.idea, draft.category, suggestionSeed, 3, language);

  function commit(next: Draft) {
    setDraft(next); setNotice(""); setError("");
    const key = draftKey(owner.current);
    writes.current = writes.current.then(async () => { await chrome.storage.local.set({ [key]: next }); setStorageError(false); }).catch(() => { setStorageError(true); });
  }
  async function checkConnection(force = false) {
    if (!force && Date.now() - lastHealthCheck.current < 5000) return;
    lastHealthCheck.current = Date.now();
    healthController.current?.abort();
    const abort = new AbortController(); healthController.current = abort;
    const timeout = setTimeout(() => abort.abort(), 10000);
    setBackendChecking(true);
    try {
      await checkBackend(abort.signal);
      if (abort.signal.aborted) return;
      setBackendReady(true); setBackendError(null);
    } catch (e) {
      if (healthController.current !== abort) return;
      setBackendReady(false); setBackendError(e instanceof ApiError ? e.reason : "network");
    } finally {
      clearTimeout(timeout);
      if (healthController.current === abort) { healthController.current = null; setBackendChecking(false); }
    }
  }
  function editResult(value: string) {
    if (disabled || !editingResult) return;
    const next = editPromptText(draft.prompt, value, draft.versions, !manualEdit.current);
    if (!next.changed) return;
    manualEdit.current = true;
    commit({ ...draft, prompt: next.prompt, versions: next.versions, savedFingerprint: "", score: null, scoreInput: "" });
    setScoreError("");
    setError("");
  }
  async function refreshUsage() {
    const ownerId = owner.current?.id;
    if (!ownerId) return;
    try {
      const json = await readJson(await api("status", { ownerId }));
      if (typeof json?.data?.isPaid !== "boolean" || (!json.data.isPaid && (!Number.isFinite(json.data.remainingThisWeek) || json.data.remainingThisWeek < 0))) throw new ApiError("Invalid usage response.", 502, false, "invalid");
      if (owner.current?.id === ownerId) {
        setUsage(json.data);
        if (json.data?.isPaid) {
          setUpgrade(false);
          setError((value) => (["en", "es", "ru"] as const).some((lang) => extensionCopy(lang).freeLimit === value) ? "" : value);
        }
      }
    }
    catch (e) {
      if (owner.current?.id !== ownerId) return;
      setUsage(null);
      if (e instanceof ApiError && e.status === 401) { setExpired(true); setError(t.expired); }
      else if (e instanceof ApiError && e.reason === "reload") { setBackendReady(false); setBackendError("reload"); }
    }
  }
  async function hydrate(nextUser: ExtensionUser | null) {
    await writes.current;
    const previousOwner = owner.current;
    const key = draftKey(nextUser);
    const stored = await chrome.storage.local.get([key, "draft:guest"]);
    let nextDraft = restoreDraft(stored[key]);
    if (nextUser && !previousOwner && !stored[key] && stored["draft:guest"]) {
      const guest = restoreDraft(stored["draft:guest"]);
      nextDraft = { ...emptyDraft(), idea: guest.idea, details: guest.details, category: guest.category };
    }
    owner.current = nextUser; setUser(nextUser); setDraft(nextDraft); manualEdit.current = false;
    if (nextUser) setSuggestionSeed(hashSeed(`${nextUser.id}:${nextUser.lastSignInAt ?? Date.now()}`));
    setExpired(false); setHistory([]); setError(""); setAuthFailure(null); setUpgrade(false); setEditingResult(false);
    setEditingIdea(false); ideaEdit.current = null; setScoreError(""); setRequestStarted(!!nextDraft.resultInput);
    if (nextUser) {
      try { await chrome.storage.local.set({ [key]: nextDraft }); await chrome.storage.local.remove("draft:guest"); setStorageError(false); }
      catch { setStorageError(true); }
      void refreshUsage();
    }
  }
  useEffect(() => {
    let mounted = true;
    void checkConnection(true);
    void (async () => {
      const prefs = await chrome.storage.local.get("language");
      const preferred = typeof prefs.language === "string" ? prefs.language : chrome.i18n.getUILanguage().slice(0, 2);
      const lang: AppLanguage = preferred === "ru" || preferred === "es" ? preferred : "en";
      if (mounted) setLanguage(lang);
      try { const next = await background<ExtensionUser | null>({ type: "session" }); if (mounted) await hydrate(next); }
      catch (e) { if (mounted) { await hydrate(null); if (e instanceof AuthFlowError) setAuthFailure(e.reason); else setError(extensionCopy(lang).expired); } }
      const info = await background<{ redirectUrl: string }>({ type: "authInfo" }).catch(() => null);
      if (mounted && info) setCallback(info.redirectUrl);
      if (mounted) setReady(true);
    })().catch(() => { if (mounted) { setStorageError(true); setReady(true); } });
    const close = () => controller.current?.abort();
    const focus = () => { void checkConnection(); if (owner.current) void refreshUsage(); };
    const online = () => void checkConnection(true);
    const accountChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      const changed = changes["umprompt-extension-auth-owner"];
      if (area !== "local" || !changed || !owner.current || changed.newValue === owner.current.id) return;
      const previousOwner = owner.current;
      close(); owner.current = null; setUser(null); setDraft(emptyDraft()); setStream(""); setHistory([]); setUsage(null); setExpired(false); setUpgrade(false);
      setEditingIdea(false); ideaEdit.current = null; setEditingResult(false); setRequestStarted(false); setScoreError("");
      if (changed.newValue === undefined) void writes.current.then(() => chrome.storage.local.remove(draftKey(previousOwner)));
    };
    chrome.storage.onChanged.addListener(accountChanged);
    window.addEventListener("pagehide", close);
    window.addEventListener("focus", focus);
    window.addEventListener("online", online);
    return () => { mounted = false; close(); healthController.current?.abort(); chrome.storage.onChanged.removeListener(accountChanged); window.removeEventListener("pagehide", close); window.removeEventListener("focus", focus); window.removeEventListener("online", online); };
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    if (!editingIdea || !ideaInput.current) return;
    ideaInput.current.focus();
    ideaInput.current.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [editingIdea]);
  useEffect(() => {
    if (!ideaInput.current) return;
    ideaInput.current.style.height = "auto";
    ideaInput.current.style.height = `${ideaInput.current.scrollHeight}px`;
  }, [draft.idea, editingIdea]);

  function beginIdeaEdit() {
    if (disabled) return;
    ideaEdit.current = draft;
    setEditingIdea(true); setEditingResult(false); setRequestStarted(true); setError(""); setNotice("");
  }
  function cancelIdeaEdit() {
    if (disabled || !ideaEdit.current) return;
    commit(ideaEdit.current);
    ideaEdit.current = null; setEditingIdea(false); setScoreError("");
  }

  async function connect(provider: "google" | "github") {
    if (lock.current || backendError === "reload") return;
    lock.current = true; setBusy("signIn"); setError(""); setAuthFailure(null); setAuthHelp(false);
    try {
      const next = await background<ExtensionUser>({ type: "signIn", provider });
      if (!next?.id) throw new Error(t.expired);
      await hydrate(next);
      setAuthHelp(false);
    } catch (e) {
      const reason = e instanceof AuthFlowError ? e.reason : "failed";
      setAuthFailure(reason);
      setAuthHelp(reason === "redirect");
    }
    finally { lock.current = false; setBusy(""); }
  }
  async function signOut() {
    if (lock.current || !window.confirm(t.confirmSignOut)) return;
    lock.current = true; setBusy("signOut");
    try {
      await writes.current;
      await background({ type: "signOut" });
      owner.current = null; setUser(null); setDraft(emptyDraft()); setUsage(null); setHistory([]); setView("prompt"); setError(""); setExpired(false); setUpgrade(false);
      setEditingIdea(false); ideaEdit.current = null; setEditingResult(false); setRequestStarted(false); setScoreError("");
    } catch { setError(t.signOutError); }
    finally { lock.current = false; setBusy(""); }
  }
  async function reloadExtension() {
    if (lock.current || !ready) return;
    lock.current = true; setBusy("reload");
    try {
      try {
        await writes.current;
        await chrome.storage.local.set({ [draftKey(owner.current)]: draft });
        setStorageError(false);
      } catch { setStorageError(true); return; }
      chrome.runtime.reload();
    } catch { setError(t.signInErrors.connection); }
    finally { lock.current = false; setBusy(""); }
  }
  function report(e: unknown, action: "expand" | "simplify" | "optimize" | "save" | "history") {
    if (e instanceof ApiError && e.status === 401) { setExpired(true); setError(t.expired); }
    else if (e instanceof ApiError && e.upgradeRequired) { setUpgrade(true); setError(t.freeLimit); }
    else if (e instanceof AuthFlowError) { setExpired(true); setAuthFailure(e.reason); }
    else if (e instanceof ApiError) {
      setError(action === "save" && e.reason === "unavailable" ? t.saveError : t.serviceErrors[e.reason]);
      if (["network", "missing", "reload"].includes(e.reason)) { setBackendReady(false); setBackendError(e.reason); setError(""); }
    }
    else if (e instanceof Error && e.name === "TimeoutError") setError(t.timeout);
    else if (e instanceof Error && e.name === "AbortError") setError(t.cancelled);
    else setError(action === "save" ? t.saveError : action === "history" ? t.historyError : t.error);
  }
  async function scoreResult(value: Draft, ownerId: string, signal: AbortSignal) {
    try {
      const json = await readJson(await api("score", { ownerId, method: "POST", body: { idea: value.idea, target_tool: "claude", generated_prompt: value.prompt, universal: true }, signal }));
      if (owner.current?.id !== ownerId || signal.aborted) return;
      commit(withScore(value, json.data));
      setScoreError("");
    } catch (e) {
      if (owner.current?.id !== ownerId) return;
      setScoreError(scoreCopy.scoringFailed);
      if (e instanceof AuthFlowError || e instanceof ApiError && e.status === 401) report(e, "expand");
    }
  }
  async function checkQuality() {
    if (lock.current || !user || expired || !backendReady || !current || editingIdea) return;
    lock.current = true; setBusy("score"); setScoreError(""); setError("");
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 90000);
    try { await scoreResult(draft, user.id, abort.signal); }
    finally { clearTimeout(timeout); controller.current = null; lock.current = false; setBusy(""); }
  }
  async function run(action: "expand" | "simplify" | "optimize") {
    if (lock.current || !user || expired || !backendReady || (action === "expand" ? !canExpandIdea(draft.idea) : !current || editingIdea) || action === "optimize" && !score) return;
    manualEdit.current = false;
    lock.current = true; setBusy(action); setError(""); setNotice(""); setStream(""); setEditingResult(false); setScoreError(""); setRequestStarted(true);
    const abort = new AbortController(); controller.current = abort;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; abort.abort(); }, 90000);
    try {
      const savedBody = draftBody(draft);
      const { versions: _versions, ...context } = savedBody.context;
      const body = { ...savedBody, context, outputLanguage: detectTextLanguage(draft.idea, language) };
      const text = action === "optimize"
        ? (await readJson(await api("optimize", { ownerId: user.id, method: "POST", body: { ...body, score, outputLanguage: detectTextLanguage(draft.prompt, language) }, signal: abort.signal }))).data?.improved_prompt
        : await readPrompt(await api("generate", { ownerId: user.id, method: "POST", body: { ...body, generated_prompt: action === "expand" ? "" : draft.prompt, ...(action === "simplify" ? { refinement: { action: "shorter", prompt: draft.prompt } } : {}) }, signal: abort.signal }), (text) => { if (owner.current?.id === user.id && !abort.signal.aborted) setStream(text); });
      if (owner.current?.id !== user.id || abort.signal.aborted) return;
      const result = acceptResult(draft, text, action);
      commit(result); setStream(""); setEditingIdea(false); ideaEdit.current = null;
      setBusy("score");
      await scoreResult(result, user.id, abort.signal);
      if (owner.current?.id === user.id && action === "optimize") setNotice(c.optimizeDone);
      void refreshUsage();
    } catch (e) { if (owner.current?.id === user.id) { if (timedOut) setError(t.timeout); else if (abort.signal.aborted) setError(t.cancelled); else report(e, action); } }
    finally { clearTimeout(timeout); controller.current = null; lock.current = false; setBusy(""); setStream(""); }
  }
  async function save() {
    if (lock.current || !user || expired || !backendReady || !current || isSaved(draft)) return;
    lock.current = true; setBusy("save"); setError("");
    try {
      const json = await readJson(await api(`prompts/${draft.id}`, { ownerId: user.id, method: "PUT", body: draftBody(draft) }));
      if (owner.current?.id !== user.id) return;
      if (json.data?.id !== draft.id) throw new Error("Save did not complete.");
      commit({ ...draft, savedFingerprint: fingerprint(draft) }); setNotice(t.saved); setEditingResult(false);
    } catch (e) { if (owner.current?.id === user.id) report(e, "save"); }
    finally { lock.current = false; setBusy(""); }
  }
  async function loadHistory() {
    if (lock.current || !user || expired || !backendReady) return;
    lock.current = true; setBusy("history"); setHistoryError(false);
    try {
      const json = await readJson(await api("prompts", { ownerId: user.id }));
      if (!Array.isArray(json?.data) || !json.data.every((row: unknown) => {
        if (!row || typeof row !== "object") return false;
        const item = row as Partial<PromptSummary>;
        return typeof item.id === "string" && typeof item.title === "string" && typeof item.idea === "string" && typeof item.generated_prompt === "string" && typeof item.updated_at === "string" && Number.isFinite(Date.parse(item.updated_at));
      })) throw new ApiError("Invalid history response.", 502, false, "invalid");
      if (owner.current?.id === user.id) setHistory(json.data);
    }
    catch (e) { if (owner.current?.id === user.id) { setHistoryError(true); report(e, "history"); } }
    finally { lock.current = false; setBusy(""); }
  }
  function openHistory(row: PromptSummary) {
    if (disabled || (draft.idea && !isSaved(draft) && !window.confirm(t.confirmHistory))) return;
    if (!row.generated_prompt?.trim()) return;
    // Reusing a saved result starts a new local draft; it never overwrites website context.
    const value = { ...emptyDraft(), idea: row.idea };
    const restored = acceptResult(value, row.generated_prompt, "history");
    // Loading history is not a new refinement.
    restored.versions = [];
    commit(restored); setView("prompt"); setEditingResult(false); setEditingIdea(false); ideaEdit.current = null; setRequestStarted(true); setScoreError(""); setError("");
  }
  function reset() {
    if (disabled || (draft.idea && !window.confirm(t.confirmNew))) return;
    manualEdit.current = false;
    commit(emptyDraft()); setError(""); setUpgrade(false); setView("prompt"); setEditingResult(false); setEditingIdea(false); ideaEdit.current = null; setRequestStarted(false); setScoreError(""); setTimeout(() => ideaInput.current?.focus(), 0);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(draft.prompt); setNotice(c.copied); setEditingResult(false); }
    catch { setError(c.copyError); }
  }
  async function copyCallback() {
    try { await navigator.clipboard.writeText(callback); setNotice(t.callbackCopied); }
    catch { setError(t.callbackCopyError); }
  }
  const example = c.expansionExample;
  const exampleView = <section className="example" aria-labelledby="example-title">
    <div className="example-heading"><BookOpen size={18} aria-hidden="true" /><h2 id="example-title">{example.label}</h2></div>
    <div className="example-before"><p className="eyebrow">{example.original}</p><p className="original">{example.idea}</p></div>
    <div className="example-transition" aria-hidden="true"><ArrowDown size={18} /></div>
    <div className="example-after"><p className="example-result-heading"><WandSparkles size={18} aria-hidden="true" />{example.title}</p>
      <dl>{[[example.goalLabel, example.goal], [example.detailsLabel, example.details], [example.outputLabel, example.output]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    {!draft.idea && <button className="text-button" disabled={disabled} onClick={() => { commit({ ...draft, idea: example.idea, category: "writing" }); ideaInput.current?.focus(); }}><ArrowUpRight size={18} />{example.use}</button>}
  </section>;

  return <>
    <header><a href={siteOrigin} target="_blank" rel="noreferrer" className="brand"><img src="icons/48.png" width="32" height="32" alt="" />Umprompt</a><div className="header-actions">
      <label className="sr-only" htmlFor="language">{t.language}</label><select id="language" value={language} disabled={disabled} onChange={(e) => { const lang = e.target.value as AppLanguage; setLanguage(lang); setNotice(""); setError(""); void chrome.storage.local.set({ language: lang }); }}><option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option></select>
      <button className="icon" title={t.newPrompt} aria-label={t.newPrompt} disabled={disabled} onClick={reset}><Plus size={20} /></button>
    </div></header>
    <nav className="main-tabs" aria-label="Umprompt"><button aria-current={view === "prompt" ? "page" : undefined} disabled={disabled} onClick={() => setView("prompt")}><WandSparkles size={18} />{t.prompt}</button><button aria-current={view === "history" ? "page" : undefined} disabled={disabled || !backendReady || !user || expired} onClick={() => { setView("history"); void loadHistory(); }}><History size={18} />{t.history}</button></nav>
    <main aria-busy={!ready} data-backend-ready={backendReady}>
      {(!user || expired) && ready && <section className="connection"><h2>{t.connect}</h2><p>{t.connectNote}</p><div className="sign-in"><button disabled={disabled || backendError === "reload"} onClick={() => void connect("google")}>{t.google}</button><button disabled={disabled || backendError === "reload"} onClick={() => void connect("github")}><Github size={18} aria-hidden="true" />{t.github}</button></div>{busy === "signIn" && <p className="progress" role="status"><span className="spinner" />{t.connecting}</p>}
        {authFailure && <div className="error auth-error" role="alert">{t.signInErrors[authFailure]}</div>}
        <details className="auth-details" open={authHelp} onToggle={(event) => setAuthHelp(event.currentTarget.open)}><summary>{t.authInfo}</summary>{authFailure && <p>{t.authCode}: <code>{`AUTH_${authFailure.toUpperCase()}`}</code></p>}{callback && <><p>{t.callback}</p><div className="callback-row"><code>{callback}</code><button className="icon" title={t.copyCallback} aria-label={t.copyCallback} onClick={() => void copyCallback()}>{notice === t.callbackCopied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}</button></div></>}</details>
      </section>}
      {backendError && <div className="error" role="alert"><p>{backendError === "network" && siteOrigin.startsWith("http://localhost") ? t.localOffline : t.serviceErrors[backendError]}</p>{backendError === "reload" ? <button className="text-button" disabled={disabled} onClick={() => void reloadExtension()}><RefreshCw size={16} />{t.reloadExtension}</button> : <button className="text-button" disabled={backendChecking} onClick={() => void checkConnection(true)}><RefreshCw size={16} />{backendChecking ? t.checkingConnection : t.retry}</button>}</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {storageError && <div className="error" role="alert">{t.storageError}</div>}
      {upgrade && <a className="plans" href={`${siteOrigin}/plan`} target="_blank" rel="noreferrer">{t.plans}<ExternalLink size={18} /></a>}
      {view === "prompt" ? <>
        <section className="composer"><h1>{hasResult && !editingIdea ? c.result : c.title}</h1>
          {hasResult && !editingIdea && <div className="idea-summary"><div className="idea-heading"><span>{c.idea}</span><button className="edit-output" aria-label={c.editIdea} disabled={disabled} onClick={beginIdeaEdit}><PenLine size={14} />{c.edit}</button></div><p data-rough-idea>{draft.idea}</p></div>}
          {(!hasResult || editingIdea) && <div id="idea-form"><div className="idea-heading"><label htmlFor="idea">{c.idea}</label>{editingIdea && <button className="text-button" disabled={disabled} onClick={cancelIdeaEdit}>{c.cancelIdeaEdit}</button>}</div>
          <textarea ref={ideaInput} id="idea" maxLength={4000} placeholder={c.placeholder} rows={4} value={draft.idea} disabled={disabled} aria-describedby="idea-feedback" onChange={(e) => commit({ ...draft, idea: e.target.value })} />
          <span className="count">{draft.idea.length} / 4000</span>
          <p id="idea-feedback" className="input-feedback">{draft.idea.trim() && !canExpandIdea(draft.idea) ? c.ideaTooShort : ""}</p>
          {!editingIdea && <div className="suggestions"><p>{draft.idea ? c.matching : c.inspiration}</p>{suggestions.map((idea) => <button key={idea.id} disabled={disabled} onClick={() => commit({ ...draft, idea: idea.idea, category: idea.category })}><span>{idea.title}</span><ArrowUpRight size={16} /></button>)}</div>}
          <details className="details"><summary>{c.context}</summary><label htmlFor="category">{c.category}</label><select id="category" value={draft.category} disabled={disabled} onChange={(e) => commit({ ...draft, category: e.target.value as Draft["category"] })}>{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{c.categories[category]}</option>)}</select><label htmlFor="details">{c.constraints}</label><textarea id="details" value={draft.details} maxLength={1200} rows={3} disabled={disabled} onChange={(e) => commit({ ...draft, details: e.target.value })} /></details>
          <button className="primary expand" disabled={disabled || !backendReady || !user || expired || !canExpandIdea(draft.idea)} onClick={() => void run("expand")}><WandSparkles size={20} />{busy === "expand" ? c.optimizingRequest : c.optimizeRequest}</button>
          <p className="privacy">{t.privacy}</p></div>}
          {busy && ["expand", "simplify", "optimize", "score"].includes(busy) && <div className="progress" role="status"><span className="spinner" />{busy === "score" ? c.checkingQuality : t.working}<button className="icon" aria-label={t.stop} title={t.stop} onClick={() => controller.current?.abort()}><X size={18} /></button></div>}
        </section>
        {(showResult || !requestStarted && !editingIdea && !busy && !hasResult) && <section className="result-section">
          {showResult ? <div id="prompt-panel">
            <div className="result-header"><p className="ready-label"><span />{stream && busy ? t.working : c.portable}</p><div className="result-tools">{hasResult && <button className="edit-output" disabled={disabled} aria-label={editingResult ? c.done : c.editPrompt} onClick={() => { manualEdit.current = false; setEditingResult(!editingResult); if (!editingResult) setTimeout(() => resultInput.current?.focus(), 0); }}>{editingResult ? <Check size={14} /> : <PenLine size={14} />}{editingResult ? c.done : c.edit}</button>}{!!draft.versions.length && <button className="icon" title={t.undo} aria-label={t.undo} disabled={disabled} onClick={() => { manualEdit.current = false; setEditingResult(false); setScoreError(""); const version = draft.versions.at(-1)!; commit({ ...draft, prompt: version.prompt, versions: draft.versions.slice(0, -1), savedFingerprint: "", score: null, scoreInput: "" }); }}><Undo2 size={18} aria-hidden="true" /></button>}</div></div>
            {editingResult ? <textarea ref={resultInput} className="output" aria-label={c.result} value={draft.prompt} onChange={(event) => editResult(event.target.value)} onBlur={() => { manualEdit.current = false; }} readOnly={disabled} maxLength={MAX_PROMPT_LENGTH} placeholder={c.promptPlaceholder} rows={8} spellCheck /> : <div className="output output-preview" aria-label={c.result}>{stream || draft.prompt || c.promptPlaceholder}</div>}
            {editingResult && <div className="editor-meta"><span className="count">{draft.prompt.length} / {MAX_PROMPT_LENGTH}</span></div>}
              {hasResult && <><div className="result-actions"><button className="text-button" disabled={disabled || !backendReady || !current || expired || !user} onClick={() => void run("simplify")}><WandSparkles size={18} />{t.simplify}</button></div>
                <button className="primary copy" disabled={disabled || !draft.prompt.trim()} onClick={() => void copy()}>{notice === c.copied ? <Check size={20} /> : <Copy size={20} />}{notice === c.copied ? c.copied : c.copy}</button>
                <button className="save" disabled={disabled || !backendReady || !current || isSaved(draft) || !user || expired} onClick={() => void save()}>{isSaved(draft) ? <Check size={18} /> : <Save size={18} />}{isSaved(draft) ? t.saved : t.save}</button></>}
            {hasResult && <section className="quality" aria-labelledby="quality-title"><div className="section-heading"><h2 id="quality-title">{c.quality}</h2>{score && <strong className="quality-score">{score.overall}<span> / 100</span></strong>}</div>
              <p className="quality-note">{c.qualityNote}</p>
              {score ? <><button className="primary" disabled={disabled || !backendReady || !current || expired || !user || editingResult} onClick={() => void run("optimize")}><Sparkles size={18} />{busy === "optimize" ? c.optimizing : scoreCopy.autoFix}</button>
                <details className="quality-details"><summary>{scoreCopy.title}</summary><dl>{score.dimensions.map((dimension) => <div key={dimension.key}><dt><span>{dimension.label}</span><strong>{dimension.score}</strong></dt><dd><progress value={dimension.score} max={100} aria-label={dimension.label} /><p>{dimension.tip || dimension.reason}</p></dd></div>)}</dl></details></>
                : <button disabled={disabled || !backendReady || !current || expired || !user || editingResult} onClick={() => void checkQuality()}><RefreshCw size={16} />{busy === "score" ? c.checkingQuality : scoreError ? scoreCopy.retryScoring : c.quality}</button>}
              {scoreError && <p className="quality-error" role="alert">{scoreError}</p>}
            </section>}
          </div> : exampleView}
        </section>}
        <p className="notice" role="status">{notice}</p>
      </> : <section className="history"><div className="section-heading"><h1>{t.history}</h1><button className="icon" title={t.refresh} aria-label={t.refresh} disabled={disabled || !backendReady || expired} onClick={() => void loadHistory()}><RefreshCw size={20} /></button></div>
        {busy === "history" && <div className="progress" role="status"><span className="spinner" />{t.working}</div>}
        {historyError ? <p role="alert">{t.historyError}<button className="text-button" disabled={disabled} onClick={() => void loadHistory()}>{t.retry}</button></p> : !history.length && !busy ? <p>{t.emptyHistory}</p> : <ul>{history.map((row) => <li key={row.id}><button disabled={disabled} onClick={() => openHistory(row)}><span><strong>{row.title}</strong><span className="history-idea">{row.idea}</span><time>{new Date(row.updated_at).toLocaleDateString(language)}</time></span><ArrowUpRight size={20} /></button></li>)}</ul>}
      </section>}
    </main>
    <footer>{user && <div className="account"><span>{user.email ?? t.connected}</span><button className="icon" disabled={disabled} aria-label={t.signOut} title={t.signOut} onClick={() => void signOut()}><LogOut size={18} /></button></div>}{usage && <p className="usage">{usage.isPaid ? t.paid : `${usage.remainingThisWeek} ${t.remaining}`}</p>}<div className="footer-links"><a href={siteOrigin} target="_blank" rel="noreferrer">{t.website}<ExternalLink size={16} /></a><a href={`${siteOrigin}/privacy`} target="_blank" rel="noreferrer">{t.privacyLink}</a></div>
    </footer>
  </>;
}
createRoot(document.getElementById("root")!).render(<Panel />);
