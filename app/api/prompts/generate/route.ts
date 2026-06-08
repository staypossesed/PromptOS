/**
 * POST /api/prompts/generate
 *
 * Streams an AI-generated prompt back to the client.
 * Auth-protected. Validates input. Surfaces clean error messages.
 *
 * Body:
 *   - idea: string (required)
 *   - target_tool: 'claude' | 'cursor' | 'chatgpt' (required)
 *   - context: object (optional)
 *   - provider: 'anthropic' | 'openrouter' (optional override)
 *   - model: registered model id (optional override)
 *   - outputLanguage: BCP-47 language code (optional)
 *
 * Response:
 *   - text/plain stream (chunked)
 *   - X-Model-Used header — short name of the model that ran
 *   - X-Provider-Used header — provider id that ran
 *   - X-Request-Id header — generation run identifier for linking to saves
 *   - X-RateLimit-Remaining / X-RateLimit-Reset headers
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamGeneratedPrompt, type GenerateInput } from "@/lib/ai/generate-prompt";
import { isValidToolId } from "@/types/prompt";
import { ProviderConfigError } from "@/lib/ai/providers";
import { getBillingStatus, checkUsageLimits, recordUsageEvent } from "@/lib/billing";
import {
  newRequestId,
  insertGenerationRun,
  markGenerationSuccess,
  markGenerationFailed,
} from "@/lib/generation-runs";

export const runtime = "nodejs";

// ─── Body validation ──────────────────────────────────────────────────────

function validateBody(
  body: unknown
): { valid: true; data: GenerateInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!b.idea || typeof b.idea !== "string" || b.idea.trim().length === 0) {
    return { valid: false, error: "Field 'idea' is required and must be a non-empty string." };
  }
  if (b.idea.length > 4000) {
    return { valid: false, error: "Field 'idea' is too long (max 4000 chars)." };
  }
  if (!isValidToolId(b.target_tool)) {
    return { valid: false, error: "Field 'target_tool' must be one of: claude, cursor, chatgpt." };
  }

  const modelOverride: GenerateInput["modelOverride"] = {};
  if (typeof b.provider === "string") modelOverride.provider = b.provider;
  if (typeof b.model === "string") modelOverride.model = b.model;
  const hasOverride = Object.keys(modelOverride).length > 0;

  return {
    valid: true,
    data: {
      idea: (b.idea as string).trim(),
      target_tool: b.target_tool,
      context:
        typeof b.context === "object" && b.context !== null
          ? (b.context as GenerateInput["context"])
          : undefined,
      modelOverride: hasOverride ? modelOverride : undefined,
      outputLanguage: typeof b.outputLanguage === "string" ? b.outputLanguage : undefined,
    },
  };
}

// ─── POST handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  // 2. Billing & usage check
  const billing = await getBillingStatus(supabase, user.id);
  const usageCheck = checkUsageLimits(billing);
  if (!usageCheck.allowed) {
    return NextResponse.json(
      {
        error: usageCheck.errorCode,
        message: usageCheck.message,
        upgradeRequired: usageCheck.errorCode === "FREE_LIMIT_REACHED",
        isPaid: billing.isPaid,
        remainingThisWeek: billing.remainingThisWeek,
      },
      { status: usageCheck.status }
    );
  }

  // 3. Parse body
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

  // 5. Insert generation run (started)
  const requestId = newRequestId();
  const startTime = Date.now();
  const runId = await insertGenerationRun({
    user_id: user.id,
    request_id: requestId,
    mode: "single",
    target_tool: validation.data.target_tool,
    output_language: validation.data.outputLanguage,
    user_idea: validation.data.idea,
    context: (validation.data.context as Record<string, unknown>) ?? undefined,
    input_chars: validation.data.idea.length,
  });

  // 6. Stream — let the generator throw if config is broken.
  try {
    const { stream, choice } = streamGeneratedPrompt(validation.data);

    // Record usage event after successfully starting the stream
    void recordUsageEvent(supabase, user.id, "generate", "prompt");

    // Non-blocking: update run on completion
    if (runId) {
      stream.text.then(async (text) => {
        await markGenerationSuccess(runId, {
          generated_output: text,
          latency_ms: Date.now() - startTime,
          output_chars: text.length,
        });
      }).catch(async () => {
        await markGenerationFailed(runId, {
          error_code: "STREAM_ERROR",
          latency_ms: Date.now() - startTime,
        });
      });
    }

    return stream.toTextStreamResponse({
      headers: {
        "X-Model-Used": choice.config.shortName,
        "X-Provider-Used": choice.provider,
        "X-Request-Id": requestId,
      },
    });
  } catch (err) {
    if (runId) {
      const msg = err instanceof Error ? err.message : String(err);
      void markGenerationFailed(runId, {
        error_code: err instanceof ProviderConfigError ? "PROVIDER_CONFIG_ERROR" : "GENERATION_ERROR",
        error_message: msg,
        latency_ms: Date.now() - startTime,
      });
    }

    if (err instanceof ProviderConfigError) {
      console.error("[generate]", { timestamp: new Date().toISOString(), userId: user.id, error: err.message });
      return NextResponse.json(
        { error: err.message, provider: err.provider },
        { status: 503 }
      );
    }

    if (err instanceof Error && /invalid model override|provider mismatch/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    const message = err instanceof Error ? err.message : "AI generation failed.";
    console.error("[generate]", { timestamp: new Date().toISOString(), userId: user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
