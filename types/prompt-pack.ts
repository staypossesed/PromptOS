import type { ToolId } from "@/lib/mock-data";
import type { PromptContext } from "@/types/prompt";
import { generateTitleFromIdea } from "@/types/prompt";

export type PackType =
  | "build_an_app"
  | "launch_a_saas"
  | "sales_outreach_campaign"
  | "automation_workflow"
  | "research_report";

export interface PackPrompt {
  title: string;
  target_tool: ToolId;
  prompt_text: string;
}

export interface PromptPack {
  title: string;
  pack_type: PackType;
  prompts: PackPrompt[];
}

export interface GeneratePackInput {
  idea: string;
  pack_type: PackType;
  context?: PromptContext;
}

export const PACK_TYPES: {
  id: PackType;
  label: string;
  emoji: string;
  description: string;
  steps: string;
}[] = [
  {
    id: "build_an_app",
    label: "Build an app",
    emoji: "⚙️",
    description: "Architecture · Cursor build · Database · Landing copy · QA",
    steps: "5 prompts",
  },
  {
    id: "launch_a_saas",
    label: "Launch a SaaS",
    emoji: "🚀",
    description: "Validation · Positioning · MVP scope · Launch email · Outreach",
    steps: "5 prompts",
  },
  {
    id: "sales_outreach_campaign",
    label: "Sales/outreach",
    emoji: "📧",
    description: "ICP · Offer · Cold email · LinkedIn DM · Follow-up sequence",
    steps: "5 prompts",
  },
  {
    id: "automation_workflow",
    label: "Automation workflow",
    emoji: "🤖",
    description: "Planning · n8n build · Data schema · Error handling · Handoff",
    steps: "5 prompts",
  },
  {
    id: "research_report",
    label: "Research/report",
    emoji: "🔍",
    description: "Brief · Research questions · Analysis · Synthesis · Summary",
    steps: "5 prompts",
  },
];

export const VALID_PACK_TYPES: PackType[] = [
  "build_an_app",
  "launch_a_saas",
  "sales_outreach_campaign",
  "automation_workflow",
  "research_report",
];

export function isValidPackType(value: unknown): value is PackType {
  return typeof value === "string" && VALID_PACK_TYPES.includes(value as PackType);
}

// ─── Database record type ─────────────────────────────────────────────────

export interface PromptPackRecord {
  id: string;
  user_id: string;
  title: string;
  idea: string;
  pack_type: PackType;
  context: PromptContext;
  prompts: PackPrompt[];
  created_at: string;
  updated_at: string;
}

// ─── UI summary type (what history cards display) ─────────────────────────

export interface PromptPackSummary {
  id: string;
  title: string;
  idea: string;
  pack_type: PackType;
  prompts: PackPrompt[];
  created_at: string;
  updated_at: string;
}

// ─── API request bodies ───────────────────────────────────────────────────

export interface CreatePromptPackBody {
  title?: string;
  idea: string;
  pack_type: PackType;
  context?: PromptContext;
  prompts: PackPrompt[];
}

export type UpdatePromptPackBody = Partial<
  Pick<PromptPackRecord, "title" | "idea" | "pack_type" | "context" | "prompts">
>;

// ─── Validation ───────────────────────────────────────────────────────────

export function validateCreatePackBody(
  body: unknown
): { valid: true; data: CreatePromptPackBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!b.idea || typeof b.idea !== "string" || b.idea.trim().length === 0) {
    return { valid: false, error: "Field 'idea' is required and must be a non-empty string." };
  }
  if (!isValidPackType(b.pack_type)) {
    return { valid: false, error: "Field 'pack_type' must be a valid pack type." };
  }
  if (!Array.isArray(b.prompts) || b.prompts.length === 0) {
    return { valid: false, error: "Field 'prompts' must be a non-empty array." };
  }

  return {
    valid: true,
    data: {
      idea: (b.idea as string).trim(),
      pack_type: b.pack_type as PackType,
      prompts: b.prompts as PackPrompt[],
      title: typeof b.title === "string" && b.title.trim()
        ? b.title.trim()
        : generateTitleFromIdea((b.idea as string).trim()),
      context: typeof b.context === "object" && b.context !== null
        ? (b.context as PromptContext)
        : {},
    },
  };
}

export function validateUpdatePackBody(
  body: unknown
): { valid: true; data: UpdatePromptPackBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const data: UpdatePromptPackBody = {};

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
  if ("pack_type" in b) {
    if (!isValidPackType(b.pack_type)) {
      return { valid: false, error: "Field 'pack_type' must be a valid pack type." };
    }
    data.pack_type = b.pack_type;
  }
  if ("context" in b) {
    data.context = (b.context as PromptContext) ?? {};
  }
  if ("prompts" in b) {
    if (!Array.isArray(b.prompts) || b.prompts.length === 0) {
      return { valid: false, error: "Field 'prompts' must be a non-empty array." };
    }
    data.prompts = b.prompts as PackPrompt[];
  }

  if (Object.keys(data).length === 0) {
    return { valid: false, error: "No updatable fields provided." };
  }

  return { valid: true, data };
}
