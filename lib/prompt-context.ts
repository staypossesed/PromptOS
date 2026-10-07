import type { PromptContext } from "@/types/prompt";
import { isTaskCategory } from "@/lib/task-categories";

export function parsePromptContext(value: unknown): { data: PromptContext; error?: never } | { error: string; data?: never } {
  if (value == null) return { data: {} };
  if (typeof value !== "object" || Array.isArray(value)) return { error: "Extra details must be an object." };
  const source = value as Record<string, unknown>;
  const context: PromptContext = {};
  if (source.profileConsent !== undefined) {
    if (typeof source.profileConsent !== "boolean") return { error: "Invalid profile consent." };
    context.profileConsent = source.profileConsent;
  }
  if (source.profile !== undefined) {
    if (!source.profile || typeof source.profile !== "object" || Array.isArray(source.profile)) return { error: "Invalid context profile." };
    const profile = source.profile as Record<string, unknown>;
    const snapshot = { id: "", name: "", details: "", audience: "", voice: "", constraints: "" };
    for (const key of Object.keys(snapshot) as (keyof typeof snapshot)[]) {
      const limit = key === "id" || key === "name" ? 80 : 1200;
      if (typeof profile[key] !== "string" || profile[key].length > limit) return { error: "Invalid context profile details." };
      snapshot[key] = profile[key].trim();
    }
    context.profile = snapshot;
  }
  if (source.versions !== undefined) {
    if (!Array.isArray(source.versions) || source.versions.length > 5) return { error: "Keep at most five previous versions." };
    const versions: NonNullable<PromptContext["versions"]> = [];
    for (const value of source.versions) {
      if (!value || typeof value !== "object") return { error: "Invalid prompt version." };
      const v = value as Record<string, unknown>;
      if (typeof v.prompt !== "string" || !v.prompt.trim() || v.prompt.length > 16000 || typeof v.action !== "string" || v.action.length > 80 || typeof v.createdAt !== "string" || v.createdAt.length > 40 || !Number.isFinite(Date.parse(v.createdAt))) return { error: "Invalid prompt version." };
      versions.push({ prompt: v.prompt, action: v.action, createdAt: v.createdAt });
    }
    context.versions = versions;
  }
  for (const key of ["projectType", "audience", "constraints", "outputFormat", "examples", "clarifications"] as const) {
    if (source[key] === undefined) continue;
    const limit = key === "clarifications" ? 1800 : 1200;
    if (typeof source[key] !== "string" || source[key].length > limit) return { error: `Extra detail '${key}' must be text of up to ${limit} characters.` };
    context[key] = source[key].trim();
  }
  if (source.category !== undefined) {
    if (!isTaskCategory(source.category)) return { error: "Please select a valid task category." };
    context.category = source.category;
  }
  if (source.universal !== undefined) {
    if (typeof source.universal !== "boolean") return { error: "Invalid prompt mode." };
    context.universal = source.universal;
  }
  return { data: context };
}

// Only the explicitly applied snapshot goes to AI. Never transmit old versions.
export function modelContext(context: PromptContext): PromptContext {
  const { versions: _versions, profileConsent, profile, ...task } = context;
  return profileConsent === true && profile ? { ...task, profile, profileConsent: true } : task;
}
