/**
 * lib/ai/generate-prompt.ts
 *
 * The generation pipeline. Two stages:
 *
 *   1. Assemble a meta-prompt from the chosen tool profile + user input.
 *   2. Stream the response from the resolved model via the Vercel AI SDK.
 *
 * SERVER-ONLY. The provider/model abstraction lives in lib/ai/providers.ts
 * and lib/ai/config.ts — see those for how to add or swap models.
 */

import { streamText, generateText } from "ai";
import { getToolProfile } from "@/lib/ai/tool-profiles";
import { resolveModel, type ResolvedModelChoice } from "@/lib/ai/config";
import type { ToolId } from "@/lib/mock-data";
import type { PromptContext } from "@/types/prompt";

// ─── Generation parameters ────────────────────────────────────────────────
// Keep output tight — execution prompts shouldn't ramble.
const MAX_TOKENS = 1500;
const TEMPERATURE = 0.4; // low-ish — we want consistency, not creativity

// ─── Input shape ──────────────────────────────────────────────────────────

export interface GenerateInput {
  idea: string;
  target_tool: ToolId;
  context?: PromptContext;
  /** Optional explicit model override. If omitted, uses env defaults. */
  modelOverride?: { provider?: string; model?: string };
}

// ─── Meta-prompt assembly ─────────────────────────────────────────────────
// Pure function — easy to unit-test and inspect.

export function buildMetaPrompt(input: GenerateInput): {
  system: string;
  user: string;
} {
  const profile = getToolProfile(input.target_tool);
  const ctx = input.context ?? {};

  const contextLines: string[] = [];
  if (ctx.projectType) contextLines.push(`Project type: ${ctx.projectType}`);
  if (ctx.audience) contextLines.push(`Audience: ${ctx.audience}`);
  if (ctx.constraints) contextLines.push(`Constraints from user: ${ctx.constraints}`);
  if (ctx.outputFormat) contextLines.push(`Output format hint: ${ctx.outputFormat}`);
  if (ctx.examples) contextLines.push(`Examples / reference: ${ctx.examples}`);

  const system = [
    `You are Umprompt, an expert prompt engineer. You turn rough user ideas into execution-ready prompts for the exact AI tool the user has chosen.`,
    ``,
    profile.systemPrimer,
    ``,
    `# Output template`,
    profile.outputTemplate,
    ``,
    `# Anti-patterns to avoid`,
    profile.antipatterns.map((a) => `- ${a}`).join("\n"),
    ``,
    `# Reference example for ${profile.displayName}`,
    profile.examples[0] ?? "(none)",
    ``,
    `# Output rules`,
    `- Output ONLY the final prompt itself. No preamble, no commentary, no markdown code fences around the whole response.`,
    `- Follow the output template exactly. Use the same section headers and structure.`,
    `- Be specific. Replace any placeholder with concrete content drawn from the user's idea.`,
    `- Be concise. The prompt should fit in roughly 150-400 words unless the task is genuinely complex.`,
    `- Do not invent facts the user did not provide. If a detail is missing, state it as an assumption inside the prompt itself.`,
  ].join("\n");

  const user = [
    `# User's idea`,
    input.idea.trim(),
    ...(contextLines.length > 0 ? ["", `# Additional context provided by the user`, ...contextLines] : []),
    ``,
    `Now write the ${profile.displayName}-optimized prompt following the template above.`,
  ].join("\n");

  return { system, user };
}

// ─── Streaming generation ─────────────────────────────────────────────────
// Returns the AI SDK StreamText result PLUS the resolved model choice
// (so the route can include it in headers / DB rows for observability).

export interface StreamResult {
  stream: ReturnType<typeof streamText>;
  choice: ResolvedModelChoice;
}

export function streamGeneratedPrompt(input: GenerateInput): StreamResult {
  // 1. Resolve the model first — throws cleanly if env is missing,
  //    overrides are invalid, or the provider's API key isn't set.
  const choice = resolveModel(input.modelOverride);

  // 2. Build the meta-prompt
  const { system, user } = buildMetaPrompt(input);

  // 3. Instantiate the model handle and start streaming
  //    The factory function is what reads the provider's API key.
  //    If that key is missing, ProviderConfigError surfaces here.
  const model = choice.config.factory();

  const stream = streamText({
    model,
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  return { stream, choice };
}

// ─── Non-streaming generation (used by Model Lab compare) ────────────────
// Returns the full text in one call instead of a stream.
// Useful when the caller needs all outputs before rendering.

export interface GenerateTextResult {
  text: string;
  choice: ResolvedModelChoice;
  usage: { inputTokens: number; outputTokens: number };
}

export async function generatePromptText(input: GenerateInput): Promise<GenerateTextResult> {
  const choice = resolveModel(input.modelOverride);
  const { system, user } = buildMetaPrompt(input);
  const model = choice.config.factory();

  const result = await generateText({
    model,
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  return {
    text: result.text,
    choice,
    usage: {
      inputTokens: result.usage.promptTokens,
      outputTokens: result.usage.completionTokens,
    },
  };
}

// ─── Exported for tests / inspection ──────────────────────────────────────

export const __MAX_TOKENS = MAX_TOKENS;
export const __TEMPERATURE = TEMPERATURE;
