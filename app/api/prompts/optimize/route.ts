/**
 * POST /api/prompts/optimize
 *
 * Rewrites a generated prompt to improve its weakest score dimensions.
 * Auth-protected. Returns the full improved prompt text.
 *
 * Body:
 *   - idea:             string (required)
 *   - target_tool:      'claude' | 'cursor' | 'chatgpt' (required)
 *   - context:          object (optional)
 *   - generated_prompt: string (required)
 *   - score:            PromptScore (required)
 *
 * Response:
 *   - { data: { improved_prompt: string } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimizePrompt } from "@/lib/ai/optimize-prompt";
import { isValidToolId } from "@/types/prompt";
import { ProviderConfigError } from "@/lib/ai/providers";
import type { PromptScore, PromptContext } from "@/types/prompt";

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

  // Validate
  if (typeof b.idea !== "string" || !b.idea.trim()) {
    return NextResponse.json({ error: "Field 'idea' is required." }, { status: 422 });
  }
  if (!isValidToolId(b.target_tool)) {
    return NextResponse.json(
      { error: "Field 'target_tool' must be one of: claude, cursor, chatgpt." },
      { status: 422 }
    );
  }
  if (typeof b.generated_prompt !== "string" || !b.generated_prompt.trim()) {
    return NextResponse.json({ error: "Field 'generated_prompt' is required." }, { status: 422 });
  }
  if (!b.score || typeof b.score !== "object") {
    return NextResponse.json(
      { error: "Field 'score' is required and must be a PromptScore object." },
      { status: 422 }
    );
  }
  const score = b.score as Record<string, unknown>;
  if (typeof score.overall !== "number" || !Array.isArray(score.dimensions)) {
    return NextResponse.json(
      { error: "Field 'score' must contain 'overall' (number) and 'dimensions' (array)." },
      { status: 422 }
    );
  }

  try {
    const improved_prompt = await optimizePrompt({
      idea: b.idea,
      target_tool: b.target_tool,
      context:
        typeof b.context === "object" && b.context !== null
          ? (b.context as PromptContext)
          : undefined,
      generated_prompt: b.generated_prompt,
      score: b.score as PromptScore,
    });

    return NextResponse.json({ data: { improved_prompt } });
  } catch (err) {
    if (err instanceof ProviderConfigError) {
      return NextResponse.json({ error: err.message, provider: err.provider }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Optimization failed.";
    console.error("[optimize] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
