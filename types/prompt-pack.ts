import type { ToolId } from "@/lib/mock-data";
import type { PromptContext } from "@/types/prompt";

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
