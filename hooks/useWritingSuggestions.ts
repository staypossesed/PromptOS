"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { continueWritingSuggestion, eligibleWritingPrefix, localWritingSuggestion, normalizeWritingSuffix, sensitiveWritingText, writingLanguage, WRITING_CONSENT_VERSION, MAX_WRITING_PREFIX, type WritingSuggestion } from "@/lib/writing-suggestions";
import { readWritingStream } from "@/lib/writing-stream";
import { loadWritingDictionary, type WritingLexicon } from "@/lib/writing-lexicon";
import type { AppLanguage } from "@/types/language";

export type WritingStatus = "idle" | "loading" | "limited" | "unavailable" | "private" | "empty" | "long";

export function useWritingSuggestions({ value, language, enabled, cloudEnabled }: {
  value: string; language: AppLanguage; enabled: boolean; cloudEnabled: boolean;
}) {
  const [candidate, setCandidate] = useState<WritingSuggestion | null>(null);
  const [status, setStatus] = useState<WritingStatus>("idle");
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [dictionary, setDictionary] = useState<WritingLexicon | null>(null);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const cache = useRef(new Map<string, string>());
  const lastRequest = useRef(0);
  const retryAfter = useRef(0);
  const candidateRef = useRef<WritingSuggestion | null>(null);
  const previousValue = useRef(value);

  const contentLanguage = writingLanguage(value, language);
  const permitted = enabled && dismissed !== value && !!value.trim() && !sensitiveWritingText(value);
  const ahead = permitted && cloudEnabled ? continueWritingSuggestion(candidate, value) : null;
  const local = permitted ? localWritingSuggestion(value, contentLanguage, dictionary?.language === contentLanguage ? dictionary : undefined) : "";
  // Computed during the input render: no timer, server request or consent gate for device-only help.
  const suggestion: WritingSuggestion | null = ahead ?? (local ? { prefix: value, suffix: local, source: "local" } : null);

  useEffect(() => {
    let active = true;
    // Only a language code goes into this public asset URL, never the draft.
    void loadWritingDictionary(contentLanguage).then(lexicon => { if (active) setDictionary(lexicon); }).catch(() => {});
    return () => { active = false; };
  }, [contentLanguage]);

  const dismiss = useCallback(() => {
    revision.current += 1; controller.current?.abort(); controller.current = null;
    candidateRef.current = null;
    setCandidate(null); setStatus("idle"); setDismissed(value);
  }, [value]);

  useEffect(() => {
    const version = ++revision.current;
    controller.current?.abort(); controller.current = null;
    setStatus("idle");
    if (previousValue.current !== value) { previousValue.current = value; if (dismissed !== null) setDismissed(null); }
    if (!cloudEnabled) { cache.current.clear(); candidateRef.current = null; setCandidate(null); return; }
    if (!enabled || dismissed === value || !value.trim()) { setCandidate(null); return; }
    if (sensitiveWritingText(value)) { candidateRef.current = null; setCandidate(null); setStatus("private"); return; }
    if (value.length > MAX_WRITING_PREFIX) { candidateRef.current = null; setCandidate(null); setStatus("long"); return; }
    const retained = continueWritingSuggestion(candidateRef.current, value);
    if (retained) { setCandidate(retained); return; }
    candidateRef.current = null; setCandidate(null);
    if (!eligibleWritingPrefix(value)) return;
    const delay = Math.max(150, 1100 - (Date.now() - lastRequest.current));
    const timer = setTimeout(() => {
      if (revision.current !== version) return;
      if (Date.now() < retryAfter.current) { setStatus("limited"); return; }
      const key = contentLanguage + ":" + value;
      const cached = cache.current.get(key);
      if (cached) { candidateRef.current = { prefix: value, suffix: cached, source: "ai" }; setCandidate(candidateRef.current); return; }
      const abort = new AbortController(); controller.current = abort;
      const timeout = setTimeout(() => abort.abort(), 10000);
      lastRequest.current = Date.now(); setStatus("loading");
      void (async () => {
        try {
          const response = await fetch("/api/writing/complete", {
            method: "POST", credentials: "omit", cache: "no-store", signal: abort.signal,
            headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
            body: JSON.stringify({ prefix: value, language: contentLanguage, consent: true, consentVersion: WRITING_CONSENT_VERSION }),
          });
          if (abort.signal.aborted || revision.current !== version) return;
          if (response.status === 429) { retryAfter.current = Date.now() + 60000; setStatus("limited"); return; }
          if (!response.ok) { setStatus("unavailable"); return; }
          const data = await readWritingStream(response, (raw, done) => {
            if (abort.signal.aborted || revision.current !== version) return;
            const suffix = normalizeWritingSuffix(value, raw);
            if (suffix) {
              candidateRef.current = { prefix: value, suffix, source: "ai" };
              setCandidate(candidateRef.current);
            } else if (done) { candidateRef.current = null; setCandidate(null); }
          }, abort.signal);
          if (abort.signal.aborted || revision.current !== version) return;
          const suffix = normalizeWritingSuffix(value, data);
          if (suffix) {
            if (cache.current.size >= 20) cache.current.delete(cache.current.keys().next().value!);
            cache.current.set(key, suffix);
          }
          setStatus(suffix ? "idle" : "empty");
        } catch {
          if (revision.current === version) { candidateRef.current = null; setCandidate(null); setStatus("unavailable"); }
        } finally { clearTimeout(timeout); }
      })();
    }, delay);
    return () => { clearTimeout(timer); controller.current?.abort(); };
  }, [value, language, contentLanguage, enabled, cloudEnabled, dismissed]);

  return { suggestion, status, dismiss, dictionarySize: dictionary?.language === contentLanguage ? dictionary.entries.length : 0 };
}
