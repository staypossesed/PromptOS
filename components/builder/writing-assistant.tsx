"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, Undo2, X } from "lucide-react";
import { useWritingSuggestions } from "@/hooks/useWritingSuggestions";
import { appendWritingSuggestion, nextWritingWord, suggestedWritingWord, writingCopy, writingLanguage, WRITING_CONSENT_VERSION } from "@/lib/writing-suggestions";
import { track } from "@/lib/analytics";
import type { AppLanguage } from "@/types/language";

const CONSENT_KEY = `umprompt:writing-consent:v${WRITING_CONSENT_VERSION}`;
type Accepted = { before: string; after: string; native: boolean; complete: boolean };

export function WritingAssistant({ id, value, onChange, language, placeholder, onFocusChange, children, disabled = false, owner = "guest" }: {
  id: string; value: string; onChange: (value: string) => void; language: AppLanguage; placeholder: string;
  onFocusChange?: (focused: boolean) => void; children?: ReactNode; disabled?: boolean; owner?: string;
}) {
  const c = writingCopy[language];
  const field = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const previousOwner = useRef(owner);
  const inserting = useRef(false);
  const [focused, setFocused] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const [composing, setComposing] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [accepted, setAccepted] = useState<Accepted | null>(null);
  const [scrollbar, setScrollbar] = useState(0);
  const eligible = focused && atEnd && !composing && !disabled && !(accepted?.complete && value === accepted.after);
  const { suggestion, status, dismiss, dictionarySize } = useWritingSuggestions({ value, language, enabled: eligible, cloudEnabled });
  const nextWord = suggestion ? suggestedWritingWord(value, suggestion.suffix) : "";

  useEffect(() => {
    try { setCloudEnabled(sessionStorage.getItem(CONSENT_KEY) === `${WRITING_CONSENT_VERSION}:${owner}`); } catch {}
  }, [owner]);
  useEffect(() => {
    if (previousOwner.current === owner) return;
    previousOwner.current = owner; setCloudEnabled(false); setConsentOpen(false); dismiss();
    try { sessionStorage.removeItem(CONSENT_KEY); } catch {}
  }, [owner, dismiss]);
  useEffect(() => { if (accepted && value !== accepted.after) setAccepted(null); }, [value, accepted]);
  useEffect(() => {
    if (mirror.current && field.current) mirror.current.scrollTop = field.current.scrollTop;
  }, [suggestion, scrollbar]);
  useEffect(() => {
    const textarea = field.current;
    if (!textarea) return;
    const sync = () => { setScrollbar(textarea.offsetWidth - textarea.clientWidth); if (mirror.current) mirror.current.scrollTop = textarea.scrollTop; };
    sync(); if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync); observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  function turnOff() {
    setCloudEnabled(false); setConsentOpen(false);
    try { sessionStorage.removeItem(CONSENT_KEY); } catch {}
  }
  function allow() {
    setCloudEnabled(true); setConsentOpen(false);
    try { sessionStorage.setItem(CONSENT_KEY, `${WRITING_CONSENT_VERSION}:${owner}`); } catch {}
    field.current?.focus({ preventScroll: true });
  }
  function updateCaret() {
    const textarea = field.current;
    if (textarea) setAtEnd(textarea.selectionStart === value.length && textarea.selectionEnd === value.length);
  }
  function accept(complete = false) {
    const textarea = field.current;
    if (!textarea || !suggestion || suggestion.prefix !== value || composing || disabled) return;
    const added = complete ? suggestion.suffix : nextWritingWord(suggestion.suffix);
    const after = appendWritingSuggestion(value, added.trimEnd());
    if (!after) return;
    const result = added.endsWith(" ") && after.length < 4000 ? after + " " : after;
    const before = value;
    textarea.focus({ preventScroll: true }); textarea.setSelectionRange(before.length, before.length);
    inserting.current = true;
    let native = false;
    try { native = document.execCommand("insertText", false, result.slice(before.length)) && textarea.value === result; } catch {}
    inserting.current = false;
    // Native insertion preserves the browser's undo stack. The visible Undo action also covers browsers without it.
    onChange(result); setAtEnd(true); setAccepted({ before, after: result, native, complete });
    track("idea_suggestion_selected", { source: "typing_" + suggestion.source, language, inputLanguage: writingLanguage(before, language) });
    requestAnimationFrame(() => { textarea.setSelectionRange(result.length, result.length); if (mirror.current) mirror.current.scrollTop = textarea.scrollTop; });
  }
  function undo() {
    if (!accepted || value !== accepted.after) return;
    const textarea = field.current;
    textarea?.focus({ preventScroll: true });
    if (accepted.native) { try { document.execCommand("undo"); } catch {} }
    onChange(accepted.before); setAccepted(null); dismiss(); setAtEnd(true);
    requestAnimationFrame(() => textarea?.setSelectionRange(accepted.before.length, accepted.before.length));
  }

  return <div className="writing-assistant" data-writing-dictionary={dictionarySize} onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  }}>
    <div className="beginner-idea-field" data-active={!value && !focused}>
      <div className="writing-input">
        <textarea ref={field} id={id} value={value} maxLength={4000} disabled={disabled} placeholder={placeholder} rows={3}
          aria-describedby={`${id}-writing-help`} autoComplete="off"
          onFocus={() => { setFocused(true); onFocusChange?.(true); updateCaret(); }}
          onBlur={() => onFocusChange?.(false)}
          onChange={event => {
            const next = event.target.value;
            setAtEnd(event.target.selectionStart === next.length && event.target.selectionEnd === next.length);
            if (!inserting.current) setAccepted(null);
            onChange(next);
          }}
          onSelect={updateCaret} onClick={updateCaret} onKeyUp={updateCaret}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => { setComposing(false); updateCaret(); }}
          onScroll={() => { if (mirror.current && field.current) mirror.current.scrollTop = field.current.scrollTop; }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing || composing) return;
            if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && suggestion) { event.preventDefault(); accept(); }
            if (event.key === "Escape" && suggestion) { event.preventDefault(); dismiss(); }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey && accepted && !accepted.native && value === accepted.after) { event.preventDefault(); undo(); }
          }} />
        {suggestion && <div ref={mirror} className="writing-ghost" style={{ right: scrollbar }} aria-hidden="true"><span>{value}</span><span className="writing-ghost-suffix">{suggestion.suffix}</span></div>}
      </div>
      {children}
    </div>
    {suggestion && <div className="writing-suggestion" data-writing-source={suggestion.source}>
      <p className="sr-only" role="status"><span>{c.suggestion} </span><strong>{nextWord}</strong></p>
      <button type="button" className="writing-accept" aria-label={`${c.acceptWord}: ${nextWord} (${c.shortcut})`} onMouseDown={event => event.preventDefault()} onClick={() => accept()}><kbd aria-hidden="true">Tab</kbd><span>{c.acceptWord}: <strong>{nextWord}</strong></span></button>
      <button type="button" className="writing-accept-all" title={suggestion.suffix.trimStart()} onMouseDown={event => event.preventDefault()} onClick={() => accept(true)}>{c.acceptAll}</button>
      <button type="button" className="writing-dismiss" aria-label={c.dismiss} title={c.dismiss} onClick={dismiss}><X size={16} aria-hidden="true" /></button>
    </div>}
    {accepted && value === accepted.after && <div className="writing-added"><span role="status">{c.added}</span><button type="button" onClick={undo}><Undo2 size={15} aria-hidden="true" />{c.undo}</button></div>}
    <div className="writing-controls" data-writing-mode={cloudEnabled ? "ai" : "local"}>
      <p id={`${id}-writing-help`}>{cloudEnabled ? c.enabled : c.local}</p>
      {!cloudEnabled && <p className="writing-enable-hint">{c.offHint}</p>}
      <button type="button" className="writing-enable" disabled={disabled} onClick={() => cloudEnabled ? turnOff() : setConsentOpen(true)}><Sparkles size={15} aria-hidden="true" />{cloudEnabled ? c.disable : c.enable}</button>
    </div>
    {consentOpen && <section className="writing-consent" aria-labelledby={`${id}-consent-title`}>
      <h2 id={`${id}-consent-title`}>{c.consentTitle}</h2><p>{c.consent}</p>
      <Link href="/privacy#writing-suggestions" target="_blank" rel="noopener noreferrer">{c.privacy}</Link>
      <div><button type="button" className="writing-allow" onClick={allow}>{c.allow}</button><button type="button" onClick={() => setConsentOpen(false)}>{c.cancel}</button></div>
    </section>}
    {cloudEnabled && eligible && status !== "idle" && <p className="writing-status" role="status">{c[status]}</p>}
  </div>;
}
