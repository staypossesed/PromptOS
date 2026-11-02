import { isDetailKey } from "@/lib/idea-questions";
import { isStudyTask } from "@/lib/task-intent";
import type { AppLanguage } from "@/types/language";
import { isSupportedLanguage } from "@/types/language";
import { dailyCopy } from "./daily-copy";

export interface RoutineSettings {
  answers: Record<string, string>;
  extra: string;
  language: AppLanguage;
  progress: string;
  completedSessions: number;
  lastCompletedAt?: string;
}
export function parseRoutineSettings(value: unknown): RoutineSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isSupportedLanguage(v.language) || typeof v.extra !== "string" || v.extra.length > 1200 || typeof v.progress !== "string" || v.progress.length > 1200 || !Number.isInteger(v.completedSessions) || (v.completedSessions as number) < 0 || (v.completedSessions as number) > 10000) return null;
  if (!v.answers || typeof v.answers !== "object" || Array.isArray(v.answers) || Object.keys(v.answers).length > 5) return null;
  const answers: Record<string, string> = {};
  for (const [key, answer] of Object.entries(v.answers)) {
    if ((!isDetailKey(key) && !["exam", "timeframe", "studyTime", "level", "recipient", "tone", "planning", "explain"].includes(key)) || typeof answer !== "string" || answer.length > 600) return null;
    answers[key] = answer.trim();
  }
  if (v.lastCompletedAt !== undefined && (typeof v.lastCompletedAt !== "string" || v.lastCompletedAt.length > 40 || !Number.isFinite(Date.parse(v.lastCompletedAt)))) return null;
  return { answers, extra: v.extra.trim(), language: v.language, progress: v.progress.trim(), completedSessions: v.completedSessions as number, ...(v.lastCompletedAt ? { lastCompletedAt: v.lastCompletedAt as string } : {}) };
}
export function dailyTaskKind(idea: string): "study" | "email" | "plan" | "explain" | "other" {
  if (isStudyTask(idea)) return "study";
  if (/email|message|letter|письм|сообщен|correo|mensaje|carta/i.test(idea)) return "email";
  if (/plan|week|trip|план|недел|поезд|viaje|semana/i.test(idea)) return "plan";
  return /explain|understand|объясн|разобра|понят|explic|entender|comprend/i.test(idea) ? "explain" : "other";
}
export function usefulNextTask(idea: string, language: AppLanguage, progress = ""): { label: string; idea: string } {
  const c = dailyCopy(language); const kind = dailyTaskKind(idea);
  const label = kind === "study" ? c.nextStudy : kind === "email" ? c.nextEmail : kind === "plan" ? c.nextPlan : kind === "explain" ? c.nextExplain : c.nextOther;
  const guard = kind === "study" ? c.needsTopic : kind === "email" ? c.needsReply : kind === "plan" ? c.needsChanges : "";
  const prefix = `${label}. ${guard}\n\n${c.sourceGoal}:\n`;
  const note = progress.trim() ? `\n\n${c.sourceProgress}:\n${progress.trim().slice(0,1200)}` : "";
  return { label, idea: prefix + idea.slice(0, 4000 - prefix.length - note.length) + note };
}
export function recordStudySession(settings: RoutineSettings, complete: boolean, now = new Date()): RoutineSettings {
  const sameDay = settings.lastCompletedAt && new Date(settings.lastCompletedAt).toDateString() === now.toDateString();
  return complete && !sameDay ? { ...settings, completedSessions: Math.min(settings.completedSessions + 1, 10000), lastCompletedAt: now.toISOString() } : settings;
}
