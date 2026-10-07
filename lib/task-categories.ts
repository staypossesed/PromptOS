export const TASK_CATEGORIES = ["auto", "writing", "coding", "research", "daily", "business", "creative"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export function isTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === "string" && TASK_CATEGORIES.includes(value as TaskCategory);
}

export const CATEGORY_GUIDANCE: Record<TaskCategory, string> = {
  auto: "Identify the real task from the idea. Use only structure that helps complete it.",
  writing: "Specify audience, purpose, tone and deliverable. Preserve the user's voice. Include examples only when they clarify a requested style.",
  coding: "State the behavior and acceptance criteria. Ask the coding agent to inspect the existing project before deciding file paths, stack or dependencies. Never invent repository details.",
  research: "Define the question, scope and useful comparison criteria. Request verifiable sources, dates for changing facts, and separation of evidence from inference. Do not invent findings.",
  daily: "Produce a practical plan or answer with usable steps. Respect the user's time, budget and preferences. Keep simple tasks simple.",
  business: "Define the audience, business objective and concrete deliverable. Separate supplied data from assumptions. Avoid invented claims, metrics and testimonials.",
  creative: "Specify the concept, medium and desired feel. Preserve room for creativity. Add constraints only when relevant to the user's intent.",
};
