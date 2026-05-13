/**
 * POST /api/model-lab/compare
 *
 * Generates prompts from multiple models in parallel and scores each output.
 * Returns an array of results — one per model requested.
 *
 * Body:
 *   - idea: string (required)
 *   - target_tool: 'claude' | 'cursor' | 'chatgpt' (required)
 *   - context: object (optional)
 *   - models: string[] (1–4 registered model IDs, required)
 *
 * Auth-protected. Rate-limited (10 comparisons / user / day).
 * Prompt content is NOT logged to analytics.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePromptText } from "@/lib/ai/generate-prompt";
import { scorePrompt } from "@/lib/ai/score-prompt";
import { getModelConfig, isValidModelId, ProviderConfigError } from "@/lib/ai/providers";
import { rateLimit, retryAfterMessage } from "@/lib/rate-limit";
import { isValidToolId } from "@/types/prompt";
import type { PromptContext } from "@/types/prompt";
import type { ToolId } from "@/lib/mock-data";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CompareBody {
  idea: string;
  target_tool: ToolId;
  context?: PromptContext;
  models: string[];
}

export interface ModelLabResult {
  model: string;
  displayName: string;
  shortName: string;
  output: string | null;
  score: import("@/types/prompt").PromptScore | null;
  latencyMs: number;
  estimatedCostUSD: number | null;
  error: string | null;
}

// ─── Validation ────────────────────────────────────────────────────────────

function validateBody(
  body: unknown
): { valid: true; data: CompareBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!b.idea || typeof b.idea !== "string" || b.idea.trim().length === 0) {
    return { valid: false, error: "'idea' is required." };
  }
  if (b.idea.length > 4000) {
    return { valid: false, error: "'idea' is too long (max 4000 chars)." };
  }
  if (!isValidToolId(b.target_tool)) {
    return { valid: false, error: "'target_tool' must be one of: claude, cursor, chatgpt." };
  }
  if (!Array.isArray(b.models) || b.models.length === 0) {
    return { valid: false, error: "'models' must be a non-empty array." };
  }
  if (b.models.length > 4) {
    return { valid: false, error: "'models' can have at most 4 entries." };
  }
  const invalid = (b.models as unknown[]).filter((m) => !isValidModelId(m));
  if (invalid.length > 0) {
    return { valid: false, error: `Invalid model(s): ${invalid.join(", ")}` };
  }

  return {
    valid: true,
    data: {
      idea: (b.idea as string).trim(),
      target_tool: b.target_tool as ToolId,
      models: b.models as string[],
      context:
        typeof b.context === "object" && b.context !== null
          ? (b.context as PromptContext)
          : undefined,
    },
  };
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  // 2. Rate limit
  const rate = await rateLimit(user.id, "model_lab");
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Model Lab limit reached (${rate.limit}/day). Try again in ${retryAfterMessage(rate.resetAt)}.`,
      },
      { status: 429 }
    );
  }

  // 3. Parse
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 4. Validate
  const validation = validateBody(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { idea, target_tool, context, models } = validation.data;

  // 5. Generate + score each model in parallel.
  //    Each model is isolated — one failure doesn't kill the others.
  const settled = await Promise.allSettled(
    models.map(async (modelId): Promise<ModelLabResult> => {
      const start = Date.now();

      // Generation
      let text: string;
      let usage: { inputTokens: number; outputTokens: number };
      let displayName: string;
      let shortName: string;

      try {
        const gen = await generatePromptText({
          idea,
          target_tool,
          context,
          modelOverride: { model: modelId },
        });
        text = gen.text;
        usage = gen.usage;
        displayName = gen.choice.config.displayName;
        shortName = gen.choice.config.shortName;
      } catch (err) {
        const config = isValidModelId(modelId) ? getModelConfig(modelId) : null;
        const msg =
          err instanceof ProviderConfigError
            ? `Provider not configured: ${err.message}`
            : err instanceof Error
            ? err.message
            : "Generation failed.";
        return {
          model: modelId,
          displayName: config?.displayName ?? modelId,
          shortName: config?.shortName ?? modelId,
          output: null,
          score: null,
          latencyMs: Date.now() - start,
          estimatedCostUSD: null,
          error: msg,
        };
      }

      const latencyMs = Date.now() - start;

      // Score (best-effort — failure doesn't break the result)
      let score = null;
      try {
        score = await scorePrompt(text, idea, target_tool);
      } catch {
        // Score is optional
      }

      // Estimated cost
      const config = getModelConfig(modelId);
      const estimatedCostUSD =
        (usage.inputTokens * config.inputCostPerMTok +
          usage.outputTokens * config.outputCostPerMTok) /
        1_000_000;

      return {
        model: modelId,
        displayName,
        shortName,
        output: text,
        score,
        latencyMs,
        estimatedCostUSD,
        error: null,
      };
    })
  );

  // Unwrap allSettled — unexpected Promise rejections become error results
  const results: ModelLabResult[] = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const config = isValidModelId(models[i]) ? getModelConfig(models[i]) : null;
    return {
      model: models[i],
      displayName: config?.displayName ?? models[i],
      shortName: config?.shortName ?? models[i],
      output: null,
      score: null,
      latencyMs: 0,
      estimatedCostUSD: null,
      error: r.reason instanceof Error ? r.reason.message : "Unknown error.",
    };
  });

  // Log metadata only — never prompt content
  console.info("[model-lab:compare]", {
    timestamp: new Date().toISOString(),
    userId: user.id,
    target_tool,
    models,
    model_count: models.length,
    latencies: results.map((r) => ({ model: r.shortName, ms: r.latencyMs })),
    scores: results.map((r) => ({ model: r.shortName, score: r.score?.overall ?? null })),
  });

  return NextResponse.json({ data: results });
}
