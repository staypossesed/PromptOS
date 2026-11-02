"use client";
import { useEffect, useRef, useState } from "react";
import { answeredQuestions, parseIdeaQuestions } from "@/lib/idea-questions";
import type { BeginnerQuestion } from "@/lib/beginner-copy";
import type { AppLanguage } from "@/types/language";

export function useIdeaQuestions({ idea, language, userId, enabled, ready, answers, snapshot }: {
  idea: string; language: AppLanguage; userId: string | null; enabled: boolean; ready: boolean; answers: Record<string, string>; snapshot?: {idea: string; questions: BeginnerQuestion[]};
}) {
  const key = JSON.stringify([userId, language, idea]);
  const [state, setState] = useState<{key: string; questions: BeginnerQuestion[]; status: "loading" | "ready" | "error" | "skipped"}>({ key: "", questions: [], status: "ready" });
  const [retryCount, setRetryCount] = useState(0);
  const cache = useRef(new Map<string, BeginnerQuestion[]>());
  const saved = answeredQuestions(answers);
  const hasSaved = saved.length > 0;
  const skipped = state.key === key && state.status === "skipped";
  useEffect(() => {
    if (!enabled || !ready || skipped) return;
    const cached = cache.current.get(key) ?? (snapshot?.idea === idea ? snapshot.questions : undefined);
    if (cached) { setState({ key, questions: cached, status: "ready" }); return; }
    if (hasSaved) return;
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(() => controller.abort(), 20000);
    setState({ key, questions: [], status: "loading" });
    void (async () => {
      try {
        const response = await fetch(userId ? "/api/prompts/clarify" : "/api/guest/clarify", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ idea, category: "auto", outputLanguage: language, context: { universal: true } })
        });
        if (!response.ok) throw new Error();
        const data = parseIdeaQuestions((await response.json()).data);
        if (!data) throw new Error();
        if (active) { if (cache.current.size >= 8) cache.current.clear(); cache.current.set(key, data); setState({ key, questions: data, status: "ready" }); }
      } catch { if (active) setState({ key, questions: [], status: "error" }); }
      finally { clearTimeout(timer); }
    })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [enabled, ready, key, idea, language, userId, retryCount, hasSaved, skipped, snapshot]);
  // Once the full set is loaded, choosing one answer must not hide the other question.
  const current = state.key === key ? state : null;
  const questions = current?.status === "ready" ? current.questions : saved;
  return {
    questions,
    loading: enabled && ready && !hasSaved && !skipped && (!current || current.status === "loading"),
    failed: enabled && !hasSaved && current?.status === "error",
    skip: () => setState({ key, questions: [], status: "skipped" }),
    retry: () => { cache.current.delete(key); setState({ key: "", questions: [], status: "ready" }); setRetryCount(count => count + 1); }
  };
}
