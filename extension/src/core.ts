import type { TaskCategory } from "../../lib/task-categories";
import { isTaskCategory } from "../../lib/task-categories";
import { rememberVersion, type PromptVersion } from "../../lib/workspace";
import { AuthFlowError, isAuthFailure } from "./auth-flow";
import { canExpandIdea } from "../../lib/prompt-editing";
import type { PromptScore } from "../../types/prompt";

export interface ExtensionUser { id: string; email?: string; lastSignInAt?: string }
export interface Draft {
  id: string;
  idea: string;
  details: string;
  category: TaskCategory;
  prompt: string;
  versions: PromptVersion[];
  resultInput: string;
  savedFingerprint: string;
  score: PromptScore | null;
  scoreInput: string;
}
export function emptyDraft(): Draft {
  return { id: crypto.randomUUID(), idea: "", details: "", category: "auto", prompt: "", versions: [], resultInput: "", savedFingerprint: "", score: null, scoreInput: "" };
}
export function inputFingerprint(draft: Draft): string { return JSON.stringify([draft.idea, draft.details, draft.category]); }
export function fingerprint(draft: Draft): string {
  const fields: unknown[] = [inputFingerprint(draft), draft.prompt, draft.versions];
  const score = draftScore(draft);
  if (score) fields.push(score);
  return JSON.stringify(fields);
}
export function isCurrent(draft: Draft): boolean { return canExpandIdea(draft.idea) && !!draft.prompt.trim() && draft.resultInput === inputFingerprint(draft); }
export function isSaved(draft: Draft): boolean { return isCurrent(draft) && draft.savedFingerprint === fingerprint(draft); }
export function scoreFingerprint(draft: Draft): string { return JSON.stringify([inputFingerprint(draft), draft.prompt]); }
export function draftScore(draft: Draft): PromptScore | null { return isCurrent(draft) && draft.scoreInput === scoreFingerprint(draft) ? draft.score : null; }
export function parsePromptScore(value: unknown): PromptScore | null {
  if (!value || typeof value !== "object") return null;
  const score = value as PromptScore;
  const validNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
  const validText = (s: unknown, max: number): s is string => typeof s === "string" && s.length <= max;
  if (!validNumber(score.overall) || !Array.isArray(score.dimensions) || !score.dimensions.length || score.dimensions.length > 8) return null;
  const keys = new Set<string>();
  for (const d of score.dimensions) {
    if (!d || !validText(d.key, 80) || !d.key.trim() || keys.has(d.key) || !validText(d.label, 160) || !d.label.trim() || !validNumber(d.score) || !validText(d.reason, 4000) || !validText(d.tip, 4000)) return null;
    keys.add(d.key);
  }
  return { overall: score.overall, dimensions: score.dimensions.map(({ key, label, score, reason, tip }) => ({ key, label, score, reason, tip })) };
}
export function withScore(draft: Draft, value: unknown): Draft {
  const score = parsePromptScore(value);
  if (!isCurrent(draft) || !score) throw new Error("Invalid quality check.");
  return { ...draft, score, scoreInput: scoreFingerprint(draft) };
}
export function acceptResult(draft: Draft, prompt: unknown, action: string): Draft {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 16000) throw new Error("Invalid prompt result.");
  const newTask = !!draft.prompt && !isCurrent(draft);
  return { ...draft, id: newTask ? crypto.randomUUID() : draft.id, prompt: prompt.trim(),
    versions: newTask ? [] : rememberVersion(draft.versions, draft.prompt, action),
    resultInput: inputFingerprint(draft), savedFingerprint: "", score: null, scoreInput: "" };
}
export function restoreDraft(value: unknown): Draft {
  const empty = emptyDraft();
  if (!value || typeof value !== "object") return empty;
  const d = value as Partial<Draft>;
  if (typeof d.id !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(d.id)) return empty;
  const restored: Draft = { ...empty, id: d.id,
    idea: typeof d.idea === "string" ? d.idea.slice(0, 4000) : "",
    details: typeof d.details === "string" ? d.details.slice(0, 1200) : "",
    category: isTaskCategory(d.category) ? d.category : "auto",
    prompt: typeof d.prompt === "string" ? d.prompt.slice(0, 16000) : "",
    resultInput: typeof d.resultInput === "string" ? d.resultInput : "",
    savedFingerprint: typeof d.savedFingerprint === "string" ? d.savedFingerprint : "",
    versions: Array.isArray(d.versions) ? d.versions.filter((v) => v && typeof v === "object" && typeof v.prompt === "string" && v.prompt.length <= 16000 && typeof v.action === "string" && v.action.length <= 80 && typeof v.createdAt === "string" && Number.isFinite(Date.parse(v.createdAt))).slice(-5) : [],
  };
  if (d.scoreInput === scoreFingerprint(restored)) {
    restored.score = parsePromptScore(d.score);
    restored.scoreInput = restored.score ? d.scoreInput : "";
  }
  return restored;
}
export function draftBody(draft: Draft) {
  return { idea: draft.idea.trim(), target_tool: "claude", generated_prompt: draft.prompt,
    context: { universal: true, category: draft.category, constraints: draft.details, versions: draft.versions }, score: draftScore(draft) };
}
export function draftKey(user: ExtensionUser | null): string { return `draft:${user?.id ?? "guest"}`; }

export type AuthMessage =
  | { type: "session" } | { type: "token" } | { type: "signOut" }
  | { type: "signIn"; provider: "google" | "github" }
  | { type: "authInfo" };
export async function background<T>(message: AuthMessage): Promise<T> {
  let result;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = chrome.runtime.sendMessage(message);
    result = message.type === "signIn" ? await response : await Promise.race([
      response,
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new AuthFlowError("connection")), 15000); }),
    ]);
  } catch { throw new AuthFlowError("connection"); }
  finally { clearTimeout(timeout); }
  if (!result?.ok) {
    if (isAuthFailure(result?.authIssue)) throw new AuthFlowError(result.authIssue);
    if (message.type === "signIn") throw new AuthFlowError(result ? "failed" : "connection");
    throw new Error(result?.error ?? "Could not connect to Umprompt.");
  }
  return result.data as T;
}
