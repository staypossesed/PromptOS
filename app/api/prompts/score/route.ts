/**
 * POST /api/prompts/score
 *
 * Scores a generated prompt using a second LLM call (structured object generation).
 * Auth-protected. Returns a PromptScore JSON object.
 *
 * Body:
 *   - generated_prompt: string (required)
 *   - idea:             string (required)
 *   - target_tool:      'claude' | 'cursor' | 'chatgpt' (required)
 *
 * Response:
 *   - { data: PromptScore }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scorePrompt } from "@/lib/ai/score-prompt";
import { isValidToolId } from "@/types/prompt";
import { ProviderConfigError } from "@/lib/ai/providers";
import { rateLimit, retryAfterMessage } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  // Rate limit
  const rate = await rateLimit(user.id, "score");
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. You can score up to ${rate.limit} prompts per day. Try again in ${retryAfterMessage(rate.resetAt)}.` },
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

  // Parse
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 422 });
  }
  const b = body as Record<string, unknown>;

  if (typeof b.generated_prompt !== "string" || !b.generated_prompt.trim()) {
    return NextResponse.json({ error: "Field 'generated_prompt' is required." }, { status: 422 });
  }
  if (typeof b.idea !== "string" || !b.idea.trim()) {
    return NextResponse.json({ error: "Field 'idea' is required." }, { status: 422 });
  }
  if (!isValidToolId(b.target_tool)) {
    return NextResponse.json(
      { error: "Field 'target_tool' must be one of: claude, cursor, chatgpt." },
      { status: 422 }
    );
  }

  try {
    const score = await scorePrompt(b.generated_prompt, b.idea, b.target_tool);
    return NextResponse.json({ data: score });
  } catch (err) {
    if (err instanceof ProviderConfigError) {
      return NextResponse.json({ error: err.message, provider: err.provider }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Scoring failed.";
    console.error("[score]", { timestamp: new Date().toISOString(), userId: user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
