import { parsePromptContext } from "@/lib/prompt-context";
import { isTaskCategory, type TaskCategory } from "@/lib/task-categories";
import type { PromptContext, PromptRecord } from "@/types/prompt";

export function promptFingerprint(prompt: Pick<PromptRecord, "idea" | "target_tool" | "context" | "generated_prompt" | "score">): string {
  return JSON.stringify([prompt.idea, prompt.target_tool, prompt.context, prompt.generated_prompt, prompt.score]);
}

export interface ContextProfile {
  details: string;
  audience: string;
  voice: string;
  constraints: string;
}
export interface Playbook {
  idea: string;
  context: PromptContext;
}
export type WorkspaceInput =
  | { kind: "profile"; name: string; payload: ContextProfile }
  | { kind: "playbook"; name: string; payload: Playbook };
export type WorkspaceItem = WorkspaceInput & { id: string; updated_at: string };

function boundedItem(data: WorkspaceInput): { data?: WorkspaceInput; error?: string } {
  return new TextEncoder().encode(JSON.stringify(data.payload)).length <= 16000
    ? { data } : { error: "These details are too long. Shorten them before saving." };
}

export function parseWorkspaceItem(value: unknown): { data?: WorkspaceInput; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Expected an object." };
  const item = value as Record<string, unknown>;
  if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 80) return { error: "Name must be 1-80 characters." };
  if (!item.payload || typeof item.payload !== "object" || Array.isArray(item.payload)) return { error: "Missing details." };
  const payload = item.payload as Record<string, unknown>;
  const name = item.name.trim();
  if (item.kind === "profile") {
    const data: ContextProfile = { details: "", audience: "", voice: "", constraints: "" };
    for (const key of Object.keys(data) as (keyof ContextProfile)[]) {
      if (payload[key] !== undefined && (typeof payload[key] !== "string" || (payload[key] as string).length > 1200)) return { error: `${key} must be at most 1200 characters.` };
      data[key] = (payload[key] as string | undefined)?.trim() ?? "";
    }
    if (!Object.values(data).some(Boolean)) return { error: "Add at least one profile detail." };
    return boundedItem({ kind: "profile", name, payload: data });
  }
  if (item.kind === "playbook") {
    if (typeof payload.idea !== "string" || !payload.idea.trim() || payload.idea.length > 4000) return { error: "Idea must be 1-4000 characters." };
    const context = parsePromptContext(payload.context);
    if (!context.data) return { error: context.error };
    // A playbook is reusable task context, not a copy of a person's profile or old results.
    const { profile: _profile, profileConsent: _consent, versions: _versions, clarifications: _answers, ...reusable } = context.data;
    return boundedItem({ kind: "playbook", name, payload: { idea: payload.idea.trim(), context: reusable } });
  }
  return { error: "Invalid item kind." };
}

export const REFINEMENTS = ["shorter", "specific", "steps", "professional"] as const;
export type Refinement = typeof REFINEMENTS[number];
export function isRefinement(value: unknown): value is Refinement {
  return typeof value === "string" && REFINEMENTS.includes(value as Refinement);
}
export const REFINEMENT_INSTRUCTIONS: Record<Refinement, string> = {
  shorter: "Make this prompt substantially shorter without losing essential facts, constraints, or the requested deliverable.",
  specific: "Make success criteria and deliverables more concrete using only provided facts. Do not invent details or add unnecessary complexity.",
  steps: "Ask for a practical, ordered action plan with clear deliverables. Preserve the original task and constraints. Do not request hidden chain-of-thought.",
  professional: "Use clear, polished professional language. Preserve the original intent, facts and level of commitment; do not add claims.",
};

export interface PromptVersion { prompt: string; action: string; createdAt: string }
export function rememberVersion(versions: PromptVersion[] | undefined, prompt: string, action: string): PromptVersion[] {
  if (!prompt.trim()) return versions ?? [];
  return [...(versions ?? []).filter((v) => v.prompt !== prompt), { prompt, action, createdAt: new Date().toISOString() }].slice(-5);
}

const NEXT_STEPS: Record<TaskCategory, string[]> = {
  auto: ["Turn this into an action plan", "Check this for gaps", "Explain this more simply"],
  writing: ["Create a shorter version", "Draft a follow-up message", "Review clarity and tone"],
  coding: ["Create a test plan", "Review security risks", "Write the project documentation"],
  research: ["Check sources and missing evidence", "Compare the alternatives", "Turn findings into an action plan"],
  daily: ["Make a practical checklist", "Adapt this to a smaller budget", "Plan the next week"],
  business: ["Draft a customer-facing message", "Create a launch checklist", "Plan a small experiment"],
  creative: ["Explore three alternative directions", "Create a production checklist", "Draft a creative brief"],
};
export function nextSteps(category: unknown): string[] { return NEXT_STEPS[isTaskCategory(category) ? category : "auto"]; }
export function nextStepIdea(idea: string, instruction: string): string {
  return `${instruction}.\n\nProject context (not a completed result):\n${idea}`.slice(0, 4000);
}

export function shouldOfferUpgrade(isPaid: boolean, hasValue: boolean, remaining: number | null): boolean {
  return !isPaid && hasValue && remaining !== null && remaining <= 2;
}
