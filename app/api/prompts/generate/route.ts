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
 *
 * Response:
 *   - text/plain stream (chunked)
 *   - X-Model-Used header — short name of the model that ran
 *   - X-Provider-Used header — provider id that ran
 *   - X-RateLimit-Remaining / X-RateLimit-Reset headers
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamGeneratedPrompt, type GenerateInput } from "@/lib/ai/generate-prompt";
import { isValidToolId } from "@/types/prompt";
import { ProviderConfigError } from "@/lib/ai/providers";
import { rateLimit, retryAfterMessage } from "@/lib/rate-limit";

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

  // Optional model override — accept any string here; resolveModel() will validate
  // against the registry and throw a typed error we can surface as 422 below.
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

  // 2. Rate limit
  const rate = await rateLimit(user.id, "generate");
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. You can generate up to ${rate.limit} prompts per day. Try again in ${retryAfterMessage(rate.resetAt)}.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rate.resetAt),
          "X-RateLimit-Limit": String(rate.limit),
        },
      }
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

  // 5. Stream — let the generator throw if config is broken; we map
  //    each error class to the right HTTP status.
  try {
    const { stream, choice } = streamGeneratedPrompt(validation.data);

    return stream.toTextStreamResponse({
      headers: {
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(rate.resetAt),
        "X-RateLimit-Limit": String(rate.limit),
        "X-Model-Used": choice.config.shortName,
        "X-Provider-Used": choice.provider,
      },
    });
  } catch (err) {
    // Provider mis-configuration → 503 (the server can't fulfil the request)
    if (err instanceof ProviderConfigError) {
      console.error("[generate]", { timestamp: new Date().toISOString(), userId: user.id, error: err.message });
      return NextResponse.json(
        { error: err.message, provider: err.provider },
        { status: 503 }
      );
    }

    // Invalid override → 422 (caller's fault)
    if (err instanceof Error && /invalid model override|provider mismatch/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    // Anything else → 500
    const message = err instanceof Error ? err.message : "AI generation failed.";
    console.error("[generate]", { timestamp: new Date().toISOString(), userId: user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
