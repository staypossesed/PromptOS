import type { PromptContext } from "@/types/prompt";
import { isTaskCategory } from "@/lib/task-categories";

export function parsePromptContext(value: unknown): { data: PromptContext; error?: never } | { error: string; data?: never } {
  if (value == null) return { data: {} };
  if (typeof value !== "object" || Array.isArray(value)) return { error: "Extra details must be an object." };
  const source = value as Record<string, unknown>;
  const context: PromptContext = {};
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
