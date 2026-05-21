/**
 * lib/ai/optimize-prompt.ts
 *
 * Rewrites a generated prompt to significantly improve its weakest score dimensions.
 * Includes a similarity guard: if the first attempt is too close to the original,
 * a second call is made with stronger instructions.
 *
 * SERVER-ONLY.
 */

import { generateText } from "ai";
import type { LanguageModelV1 } from "ai";
import { getToolProfile } from "@/lib/ai/tool-profiles";
import { resolveModel } from "@/lib/ai/config";
import type { ToolId } from "@/lib/mock-data";
import type { PromptScore, ScoreDimension, PromptContext } from "@/types/prompt";

export interface OptimizeInput {
  idea: string;
  target_tool: ToolId;
  context?: PromptContext;
  generated_prompt: string;
  score: PromptScore;
  outputLanguage?: string;
}

// Dimensions scoring below this threshold are considered weak.
// 90 means most real-world prompts (scoring 60–85) will have multiple weak dimensions.
const WEAK_THRESHOLD = 90;

function identifyWeakDimensions(score: PromptScore): ScoreDimension[] {
  const weak = score.dimensions.filter((d) => d.score < WEAK_THRESHOLD);
  if (weak.length > 0) return weak;
  // All dimensions are high — optimize the lowest 2 anyway
  return [...score.dimensions].sort((a, b) => a.score - b.score).slice(0, 2);
}

// Word-level Jaccard similarity — value near 1.0 means the texts are nearly identical.
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  let common = 0;
  for (const w of setA) if (setB.has(w)) common++;
  const union = setA.size + setB.size - common;
  return union === 0 ? 1 : common / union;
}

async function callModel(
  model: LanguageModelV1,
  system: string,
  user: string,
  temperature: number
): Promise<string> {
  const { text } = await generateText({
    model,
    system,
    messages: [{ role: "user", content: user }],
    temperature,
    maxTokens: 3000,
  });
  return text.trim();
}

export async function optimizePrompt(input: OptimizeInput): Promise<string> {
  const { idea, target_tool, context, generated_prompt, score } = input;
  const profile = getToolProfile(target_tool);

  const weak = identifyWeakDimensions(score);
  const weakKeys = new Set(weak.map((d) => d.key));
  const strong = score.dimensions.filter((d) => !weakKeys.has(d.key));

  // ── Build dimension summaries ─────────────────────────────────────────────

  const weakSummary = weak
    .map((d) =>
      [
        `### ${d.label} (current: ${d.score}/100)`,
        `Why it's weak: ${d.reason}`,
        `Fix required: ${d.tip}`,
      ].join("\n")
    )
    .join("\n\n");

  const strongSummary =
    strong.length > 0
      ? strong
          .map((d) => `- ${d.label} (${d.score}/100) — already strong, do not weaken`)
          .join("\n")
      : "None.";

  const contextLines =
    context && Object.keys(context).length > 0
      ? Object.entries(context)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "None provided.";

  // ── System prompt ─────────────────────────────────────────────────────────

  const langInstruction =
    input.outputLanguage && input.outputLanguage !== "en"
      ? `\nLanguage: Preserve the language of the original prompt (${input.outputLanguage}). Keep code identifiers, API names, file paths, and technical terms in English.\n`
      : "";

  const system = `You are an expert prompt engineer. Your task is to produce a substantially improved version of a prompt targeting ${profile.displayName}.
${langInstruction}

The improvement must be visible and meaningful. A reviewer reading both versions should immediately notice concrete additions and clarifications — not just minor rephrasing.

Per-dimension rules (apply every one that is listed as WEAK):
- Clarity weak → rewrite all vague or ambiguous phrases to be direct and specific
- Context weak → add specific relevant context: tech stack, audience, prior state, use case
- Constraints weak → add explicit must-haves and must-nots as a numbered or bulleted list
- Examples weak → add at least one concrete, fully-written example of the desired output
- Output Format weak → describe the exact response shape: section names, order, format, length limits
- Tool Fit weak → restructure to match ${profile.displayName} conventions exactly per the template below

Non-negotiable rules:
- Preserve the user's core intent and topic without changing what is being built
- Preserve sections that score well — do not remove or weaken them
- Do not add unrelated padding or generic filler
- Target: every weak dimension should score 90+ after improvement
- Output ONLY the improved prompt — no preamble, no explanation, no trailing commentary

${profile.displayName} output format template (use as structural reference):
${profile.outputTemplate}`;

  // ── User message ──────────────────────────────────────────────────────────

  const user = `ORIGINAL IDEA: ${idea}

USER CONTEXT:
${contextLines}

CURRENT OVERALL SCORE: ${score.overall}/100

STRONG DIMENSIONS (preserve these — do not weaken):
${strongSummary}

WEAK DIMENSIONS (fix all of these — apply each tip literally):
${weakSummary}

CURRENT PROMPT (improve this):
${generated_prompt}

Write the improved prompt now. Make each weak dimension clearly better — not a minor tweak:`;

  // ── Call the model ────────────────────────────────────────────────────────

  const modelId = process.env.SCORE_AI_MODEL ?? "claude-sonnet-4-6";
  const choice = resolveModel({ model: modelId });
  const model = choice.config.factory();

  const improved = await callModel(model, system, user, 0.5);

  // ── Similarity guard ──────────────────────────────────────────────────────
  // If the output is nearly word-for-word the same as the input, the model was
  // too conservative. Retry once with a higher temperature and an explicit call
  // to make bolder changes.

  const sim = jaccardSimilarity(generated_prompt, improved);
  if (sim > 0.88) {
    const retryUser = `${user}

NOTE: Your previous attempt had ${Math.round(sim * 100)}% word overlap with the original — the improvement is not visible enough. You must add substantial new content to every weak dimension above. Add real examples, explicit constraints, concrete context, and exact output format specifications. Produce a clearly superior version now:`;

    return callModel(model, system, retryUser, 0.7);
  }

  return improved;
}
