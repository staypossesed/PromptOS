import type { ToolId } from "@/lib/mock-data";

// ─── Score types (matches MOCK_SCORE shape) ────────────────────────────────

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  reason: string;
  tip: string;
}

export interface PromptScore {
  overall: number;
  dimensions: ScoreDimension[];
}

// ─── Context stored as JSONB ───────────────────────────────────────────────

export interface PromptContext {
  projectType?: string;
  audience?: string;
  constraints?: string;
  outputFormat?: string;
  examples?: string;
}

// ─── Database row shape (matches Supabase prompts table exactly) ───────────

export interface PromptRecord {
  id: string;
  user_id: string;
  title: string;
  idea: string;
  context: PromptContext;
  target_tool: ToolId;
  generated_prompt: string;
  score: PromptScore | null;
  created_at: string;
  updated_at: string;
}

// ─── API request/response bodies ──────────────────────────────────────────

/** POST /api/prompts */
export interface CreatePromptBody {
  title?: string; // auto-generated if omitted
  idea: string;
  context?: PromptContext;
  target_tool: ToolId;
  generated_prompt: string;
  score?: PromptScore | null;
}

/** PATCH /api/prompts/[id] */
export type UpdatePromptBody = Partial<
  Pick<PromptRecord, "title" | "idea" | "context" | "target_tool" | "generated_prompt" | "score">
>;

// ─── Derived UI type (what the dashboard / card needs) ────────────────────

export interface PromptSummary {
  id: string;
  title: string;
  idea: string;
  target_tool: ToolId;
  score: PromptScore | null;
  generated_prompt: string;
  created_at: string;
  updated_at: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────

const VALID_TOOLS: ToolId[] = ["claude", "cursor", "chatgpt"];

export function isValidToolId(value: unknown): value is ToolId {
  return typeof value === "string" && VALID_TOOLS.includes(value as ToolId);
}

export function validateCreateBody(
  body: unknown
): { valid: true; data: CreatePromptBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!b.idea || typeof b.idea !== "string" || b.idea.trim().length === 0) {
    return { valid: false, error: "Field 'idea' is required and must be a non-empty string." };
  }
  if (!isValidToolId(b.target_tool)) {
    return { valid: false, error: "Field 'target_tool' must be one of: claude, cursor, chatgpt." };
  }
  if (
    !b.generated_prompt ||
    typeof b.generated_prompt !== "string" ||
    b.generated_prompt.trim().length === 0
  ) {
    return { valid: false, error: "Field 'generated_prompt' is required and must be a non-empty string." };
  }

  return {
    valid: true,
    data: {
      idea: (b.idea as string).trim(),
      target_tool: b.target_tool as ToolId,
      generated_prompt: (b.generated_prompt as string).trim(),
      title: typeof b.title === "string" && b.title.trim() ? b.title.trim() : undefined,
      context: typeof b.context === "object" && b.context !== null
        ? (b.context as PromptContext)
        : {},
      score: b.score != null ? (b.score as PromptScore) : null,
    },
  };
}

export function validateUpdateBody(
  body: unknown
): { valid: true; data: UpdatePromptBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const data: UpdatePromptBody = {};

  if ("title" in b) {
    if (typeof b.title !== "string" || b.title.trim().length === 0) {
      return { valid: false, error: "Field 'title' must be a non-empty string." };
    }
    data.title = b.title.trim();
  }
  if ("idea" in b) {
    if (typeof b.idea !== "string" || b.idea.trim().length === 0) {
      return { valid: false, error: "Field 'idea' must be a non-empty string." };
    }
    data.idea = b.idea.trim();
  }
  if ("target_tool" in b) {
    if (!isValidToolId(b.target_tool)) {
      return { valid: false, error: "Field 'target_tool' must be one of: claude, cursor, chatgpt." };
    }
    data.target_tool = b.target_tool;
  }
  if ("generated_prompt" in b) {
    if (typeof b.generated_prompt !== "string" || b.generated_prompt.trim().length === 0) {
      return { valid: false, error: "Field 'generated_prompt' must be a non-empty string." };
    }
    data.generated_prompt = b.generated_prompt.trim();
  }
  if ("context" in b) {
    data.context = (b.context as PromptContext) ?? {};
  }
  if ("score" in b) {
    data.score = b.score != null ? (b.score as PromptScore) : null;
  }

  if (Object.keys(data).length === 0) {
    return { valid: false, error: "No updatable fields provided." };
  }

  return { valid: true, data };
}

/** Auto-generate a short title from the user's idea text */
export function generateTitleFromIdea(idea: string): string {
  const trimmed = idea.trim();
  // Take the first sentence or first 60 chars, whichever is shorter
  const firstSentence = trimmed.split(/[.!?]/)[0].trim();
  const candidate = firstSentence.length > 0 ? firstSentence : trimmed;
  return candidate.length > 60 ? candidate.slice(0, 57) + "…" : candidate;
}
