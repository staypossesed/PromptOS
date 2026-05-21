/**
 * lib/ai/generate-prompt-pack.ts
 *
 * Generates a coordinated Prompt Pack — 5 execution-ready prompts that
 * together cover a complete project or workflow end to end.
 *
 * Uses generateObject (Vercel AI SDK) with a JSON schema for structured output.
 * SERVER-ONLY.
 */

import { generateObject, jsonSchema } from "ai";
import { resolveModel } from "@/lib/ai/config";
import type { GeneratePackInput, PackPrompt, PromptPack } from "@/types/prompt-pack";

// ─── JSON schema for structured output ────────────────────────────────────

type RawPack = {
  title: string;
  prompts: Array<{ title: string; target_tool: string; prompt_text: string }>;
};

const PACK_SCHEMA = jsonSchema<RawPack>({
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Short, specific pack title derived from the user's idea (max 60 chars)",
    },
    prompts: {
      type: "array",
      description: "Exactly 5 execution-ready prompts covering the full workflow",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short step name, e.g. 'Core Build' or 'Cold Email Sequence'",
          },
          target_tool: {
            type: "string",
            enum: ["claude", "cursor", "chatgpt"],
          },
          prompt_text: {
            type: "string",
            description:
              "The complete, execution-ready prompt. 200-500 words. No preamble or commentary — just the prompt itself.",
          },
        },
        required: ["title", "target_tool", "prompt_text"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "prompts"],
  additionalProperties: false,
});

// ─── Pack-specific prompt instructions ────────────────────────────────────

const PACK_INSTRUCTIONS: Record<string, string> = {
  build_an_app: `Generate exactly 5 prompts in this order:
1. "Architecture & Planning" (claude) — System design prompt covering tech stack, component structure, database design, API design, and key trade-offs. Use <role>, <task>, <context>, <constraints>, <output_format> XML tags.
2. "Core Build" (cursor) — Main feature implementation with working directory, file paths, component breakdown, stack constraints, and acceptance criteria.
3. "Database Schema" (cursor) — Full database setup with table definitions, column types, relationships, indexes, and RLS policies. Include the exact SQL or ORM code.
4. "Landing Page Copy" (chatgpt) — Complete landing page: hero headline (max 8 words), subheadline, 3 benefit sections, social proof quotes, FAQ (5 questions), and a CTA. Persona-driven.
5. "QA & Testing Checklist" (claude) — Comprehensive test plan covering happy path, edge cases, error states, auth flows, and performance criteria. Use <role>, <task>, <output_format> XML tags.`,

  launch_a_saas: `Generate exactly 5 prompts in this order:
1. "Market Validation" (claude) — Customer research framework: ICP definition, interview questions for 5-10 discovery calls, pain point hypotheses, and market sizing methodology. Use XML tags.
2. "Product Positioning" (claude) — Positioning framework: who it's for, the category, key differentiators, proof points, and a positioning statement. Use XML tags.
3. "MVP Feature Scope" (cursor) — Prioritized MVP feature list with implementation instructions, file structure, and explicit scope boundaries (what not to build). Include acceptance criteria.
4. "Launch Email Campaign" (chatgpt) — 3 emails: (1) waitlist announcement, (2) launch day, (3) first-week follow-up. Each with subject line and body. Persona-driven with clear CTAs.
5. "First Customer Outreach" (chatgpt) — Personalized outreach sequence to land the first 10 customers: 3-touch sequence with LinkedIn DM, cold email, and follow-up. Include templates.`,

  sales_outreach_campaign: `Generate exactly 5 prompts in this order:
1. "ICP Research" (claude) — Ideal customer profile: demographics, firmographics, job roles, pain triggers, buying signals, and disqualifiers. Use <role>, <task>, <context>, <output_format> XML tags.
2. "Offer Positioning" (claude) — Value proposition framework: primary pain, unique mechanism, proof points, objection map, and a one-line offer statement. Use XML tags.
3. "Cold Email Sequence" (chatgpt) — 3-email cold outbound sequence with subject lines. Email 1: value hook. Email 2: social proof. Email 3: breakup. Each 75-100 words max. No filler.
4. "LinkedIn DM Sequence" (chatgpt) — Connection request (50 words) + 2 follow-up messages. Persona-driven. First line must hook immediately. No 'I came across your profile.'
5. "Follow-up Sequence" (chatgpt) — 4-touch multi-channel follow-up for non-responders: Day 3 email, Day 7 LinkedIn, Day 14 email, Day 21 breakup. Include subject lines and body for each.`,

  automation_workflow: `Generate exactly 5 prompts in this order:
1. "Workflow Planning" (claude) — Process mapping prompt: trigger definition, step-by-step data flow, decision points, success metrics, and failure modes. Use <role>, <task>, <context>, <constraints>, <output_format> XML tags.
2. "n8n Implementation" (chatgpt) — Detailed n8n workflow instructions: node types, connections, credential configuration, data transformation logic, and error paths. Node-by-node breakdown.
3. "Data Schema" (claude) — Airtable or database schema design: tables, field types, linked records, formulas, views, and naming conventions. Formatted as a schema reference.
4. "Error Handling & Recovery" (chatgpt) — Error handling strategy: common failure modes, retry logic, fallback paths, alerting, and manual intervention triggers. Structured as a runbook.
5. "Client Handoff Documentation" (chatgpt) — Complete handoff doc for a non-technical client: how the workflow runs, what to do if it fails, how to make common changes, and who to contact.`,

  research_report: `Generate exactly 5 prompts in this order:
1. "Research Brief" (claude) — Research scope and methodology: key questions to answer, data sources to use, methodology (qualitative/quantitative), success criteria, and deliverable format. Use XML tags.
2. "Primary Research Questions" (claude) — Interview guide or survey framework: 10-15 specific questions grouped by theme, with follow-up probes and context on what each question should reveal. Use XML tags.
3. "Competitive Landscape" (claude) — Structured competitive analysis: market positioning map, feature comparison matrix, pricing landscape, and strategic implications. Use XML tags.
4. "Data Synthesis & Insights" (claude) — Framework for analyzing research findings: pattern identification, key insight extraction, evidence weighting, and insight-to-recommendation mapping. Use XML tags.
5. "Executive Summary" (chatgpt) — Stakeholder-ready summary: one-page format with situation, key findings (3-5), strategic implications, and recommended next steps. Business writing tone.`,
};

// ─── Generation function ──────────────────────────────────────────────────

export async function generatePromptPack(input: GeneratePackInput): Promise<PromptPack> {
  const choice = resolveModel();
  const model = choice.config.factory();

  const packInstructions = PACK_INSTRUCTIONS[input.pack_type] ??
    "Generate 5 execution-ready prompts covering the complete workflow.";

  const ctx = input.context ?? {};
  const contextLines: string[] = [];
  if (ctx.projectType) contextLines.push(`Project type: ${ctx.projectType}`);
  if (ctx.audience) contextLines.push(`Audience: ${ctx.audience}`);
  if (ctx.constraints) contextLines.push(`Constraints: ${ctx.constraints}`);
  if (ctx.outputFormat) contextLines.push(`Output format preference: ${ctx.outputFormat}`);
  if (ctx.examples) contextLines.push(`Examples/references: ${ctx.examples}`);

  const langInstruction =
    input.outputLanguage && input.outputLanguage !== "en"
      ? `\nLanguage: Write every prompt_text in language code "${input.outputLanguage}". Keep code identifiers, API names, file paths, and technical terms in English.\n`
      : "";

  const system = `You are Umprompt, a professional prompt engineering system that creates Prompt Packs — coordinated sets of execution-ready AI prompts that together execute a complete project or workflow.
${langInstruction}
Each prompt in the pack must:
- Be complete and paste-ready — no placeholders, no commentary, just the prompt
- Be specifically tailored to its target tool:
  * Claude prompts: use <role>, <task>, <context>, <constraints>, <output_format> XML tags
  * Cursor prompts: include working directory, file paths, component names, stack details, acceptance criteria
  * ChatGPT prompts: include persona, explicit tone, concrete instructions, and expected output format
- Be specific to the user's idea — replace any generic description with concrete detail
- Be 200-500 words each

Pack instructions for this request:
${packInstructions}`;

  const user = [
    `# User's idea`,
    input.idea.trim(),
    ...(contextLines.length > 0
      ? ["", `# Additional context`, ...contextLines]
      : []),
    ``,
    `Generate the prompt pack for the idea above. Make every prompt specific, concrete, and immediately usable.`,
  ].join("\n");

  const { object } = await generateObject({
    model,
    schema: PACK_SCHEMA,
    system,
    messages: [{ role: "user", content: user }],
    temperature: 0.4,
    maxTokens: 6000,
  });

  const prompts: PackPrompt[] = object.prompts.map((p) => ({
    title: p.title,
    target_tool: p.target_tool as "claude" | "cursor" | "chatgpt",
    prompt_text: p.prompt_text,
  }));

  return {
    title: object.title,
    pack_type: input.pack_type,
    prompts,
  };
}
