/**
 * lib/ai/score-prompt.ts
 *
 * Scores a generated prompt across 6 dimensions using a structured LLM call.
 * Uses generateObject (Vercel AI SDK) with a JSON Schema — no Zod required.
 *
 * Model: claude-haiku-4-5 by default (fast + cheap for structured eval).
 * Override via SCORE_AI_MODEL env var (must be a registered model id).
 *
 * SERVER-ONLY.
 */

import { generateObject, jsonSchema } from "ai";
import { getToolProfile } from "@/lib/ai/tool-profiles";
import { resolveModel } from "@/lib/ai/config";
import type { ToolId } from "@/lib/mock-data";
import type { PromptScore, ScoreDimension } from "@/types/prompt";

// ─── Dimension config ──────────────────────────────────────────────────────

const DIMENSIONS = [
  { key: "clarity",       label: "Clarity",       weight: 0.20 },
  { key: "context",       label: "Context",        weight: 0.18 },
  { key: "constraints",   label: "Constraints",    weight: 0.15 },
  { key: "examples",      label: "Examples",       weight: 0.12 },
  { key: "output_format", label: "Output Format",  weight: 0.17 },
  { key: "tool_fit",      label: "Tool Fit",       weight: 0.18 },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

// ─── JSON schema for structured output ────────────────────────────────────

type RawDimension = { score: number; reason: string; tip: string };
type RawScoreResult = Record<DimensionKey, RawDimension>;

const dimensionShape = {
  type: "object" as const,
  properties: {
    score:  { type: "integer" as const, minimum: 0, maximum: 100,
               description: "Score from 0 to 100." },
    reason: { type: "string" as const,
               description: "One sentence: what the prompt does or doesn't do for this dimension." },
    tip:    { type: "string" as const,
               description: "One concrete, actionable improvement. Be specific, not generic." },
  },
  required: ["score", "reason", "tip"] as string[],
  additionalProperties: false,
};

const SCORE_SCHEMA = jsonSchema<RawScoreResult>({
  type: "object",
  properties: {
    clarity:       dimensionShape,
    context:       dimensionShape,
    constraints:   dimensionShape,
    examples:      dimensionShape,
    output_format: dimensionShape,
    tool_fit:      dimensionShape,
  },
  required: ["clarity", "context", "constraints", "examples", "output_format", "tool_fit"],
  additionalProperties: false,
});

// ─── Scoring function ──────────────────────────────────────────────────────

export async function scorePrompt(
  generatedPrompt: string,
  idea: string,
  targetTool: ToolId
): Promise<PromptScore> {
  const scoreModelId = process.env.SCORE_AI_MODEL ?? "claude-sonnet-4-6";
  const choice = resolveModel({ model: scoreModelId });
  const model = choice.config.factory();
  const profile = getToolProfile(targetTool);

  const system = `You are a prompt quality evaluator for AI prompts targeting ${profile.displayName}.

Score the prompt across these 6 dimensions. Be calibrated — not inflated:
- 85-100  Excellent: this dimension is handled exceptionally well
- 70-84   Good: solid, but one clear improvement available
- 50-69   Needs work: present but incomplete or generic
- 0-49    Poor: missing or actively harmful

Calibration anchor: most real-world prompts score 60-82 overall. Reserve 90+ for genuinely outstanding work.

Scoring context:
- Original idea the prompt was built from: "${idea}"
- Target tool: ${profile.displayName}

For tool_fit, judge whether the structure, syntax, and conventions used in the prompt match what ${profile.displayName} responds to best.`;

  const user = `Score this ${profile.displayName} prompt:\n\n${generatedPrompt}`;

  const { object } = await generateObject({
    model,
    schema: SCORE_SCHEMA,
    system,
    messages: [{ role: "user", content: user }],
    temperature: 0.1,
    maxTokens: 900,
  });

  const dimensions: ScoreDimension[] = DIMENSIONS.map(({ key, label }) => ({
    key,
    label,
    score:  Math.round(Math.max(0, Math.min(100, object[key].score))),
    reason: object[key].reason,
    tip:    object[key].tip,
  }));

  // Compute overall from weights — more reliable than asking the model to do math
  const overall = Math.round(
    dimensions.reduce((sum, dim, i) => sum + dim.score * DIMENSIONS[i].weight, 0)
  );

  return { overall, dimensions };
}
