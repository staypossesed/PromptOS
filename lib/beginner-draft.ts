import { parseQuestionSnapshot } from "@/lib/idea-questions";
import type { BeginnerQuestion } from "@/lib/beginner-copy";
import { parsePromptContext } from "@/lib/prompt-context";
import { parseTaskMetric, type TaskMetric } from "@/lib/task-metrics";
import type { PromptContext } from "@/types/prompt";
export const BEGINNER_DRAFT_KEY = "ump:beginner_draft:v2";
export interface BeginnerResult { idea: string; text: string; context: PromptContext; savedId?: string; saved?: boolean }
export interface BeginnerDraft { questions?: BeginnerQuestion[]; routineId?: string; metric: TaskMetric | null; outcome: boolean | null; owner: string | null; idea: string; answers: Record<string, string>; extra: string; delivery: "prompt" | "answer"; result: BeginnerResult | null; createdAt: number }
export function parseBeginnerDraft(raw: string | null, now = Date.now()): BeginnerDraft | null {
  if (!raw || raw.length > 40000) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.idea !== "string" || v.idea.length > 4000 || typeof v.extra !== "string" || v.extra.length > 1200 || !["prompt", "answer"].includes(v.delivery) || typeof v.createdAt !== "number" || v.createdAt > now || now - v.createdAt > 3600000) return null;
    if (!v.answers || typeof v.answers !== "object" || Array.isArray(v.answers) || Object.keys(v.answers).length > 5 || Object.values(v.answers).some((a) => typeof a !== "string" || a.length > 600)) return null;
    const questions = v.questions === undefined ? undefined : parseQuestionSnapshot(v.questions);
    if (questions === null) return null;
    let result: BeginnerResult | null = null;
    if (v.result) {
      const r = v.result; const context = parsePromptContext(r.context);
      if (typeof r.idea !== "string" || r.idea.length > 4000 || typeof r.text !== "string" || !r.text.trim() || r.text.length > 16000 || !context.data) return null;
      result = { idea: r.idea, text: r.text, context: context.data, saved: r.saved === true, savedId: typeof r.savedId === "string" && /^[0-9a-f-]{36}$/i.test(r.savedId) ? r.savedId : undefined };
    }
    if (v.owner != null && (typeof v.owner !== "string" || !/^[0-9a-f-]{36}$/i.test(v.owner))) return null;
    if(v.routineId !== undefined && (typeof v.routineId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.routineId)))return null;
    return { ...(questions ? {questions}:{}), ...(v.routineId ? {routineId:v.routineId}:{}), metric: parseTaskMetric(v.metric), outcome: typeof v.outcome === "boolean" ? v.outcome : null, owner: v.owner ?? null, idea: v.idea, answers: v.answers, extra: v.extra, delivery: v.delivery, result, createdAt: v.createdAt };
  } catch { return null; }
}
