import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingStatus, checkUsageLimits, recordUsageEvent } from "@/lib/billing";
import { generatePromptPack } from "@/lib/ai/generate-prompt-pack";
import { isValidPackType } from "@/types/prompt-pack";
import {
  newRequestId,
  insertGenerationRun,
  markGenerationSuccess,
  markGenerationFailed,
} from "@/lib/generation-runs";

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── Billing & usage check ────────────────────────────────────────────────
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

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { idea, pack_type, context, outputLanguage } = body as Record<string, unknown>;

  if (!idea || typeof idea !== "string" || !idea.trim()) {
    return NextResponse.json({ error: "idea is required." }, { status: 400 });
  }
  if (!isValidPackType(pack_type)) {
    return NextResponse.json({ error: "Invalid pack_type." }, { status: 400 });
  }

  // ── Insert generation run (started) ─────────────────────────────────────
  const requestId = newRequestId();
  const startTime = Date.now();
  const runId = await insertGenerationRun({
    user_id: user.id,
    request_id: requestId,
    mode: "pack",
    pack_type: pack_type as string,
    output_language: typeof outputLanguage === "string" ? outputLanguage : undefined,
    user_idea: (idea as string).trim(),
    context: (typeof context === "object" && context !== null)
      ? (context as Record<string, unknown>)
      : undefined,
    input_chars: (idea as string).length,
  });

  // ── Generate ────────────────────────────────────────────────────────────
  try {
    const pack = await generatePromptPack({
      idea: (idea as string).trim(),
      pack_type,
      context: (context as Record<string, string> | undefined) ?? {},
      outputLanguage: typeof outputLanguage === "string" ? outputLanguage : undefined,
    });

    console.info("[pack:generate]", { timestamp: new Date().toISOString(), userId: user.id, pack_type, prompt_count: pack.prompts.length });
    void recordUsageEvent(supabase, user.id, "generate", "pack");

    if (runId) {
      void markGenerationSuccess(runId, {
        generated_json: pack as unknown as Record<string, unknown>,
        latency_ms: Date.now() - startTime,
        output_chars: JSON.stringify(pack).length,
      });
    }

    return NextResponse.json({ data: pack }, {
      headers: { "X-Request-Id": requestId },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[pack:generate]", { timestamp: new Date().toISOString(), userId: user.id, pack_type, error: errMsg });

    if (runId) {
      void markGenerationFailed(runId, {
        error_code: "PACK_GENERATION_ERROR",
        error_message: errMsg,
        latency_ms: Date.now() - startTime,
      });
    }

    return NextResponse.json(
      { error: "Pack generation failed. Please try again." },
      { status: 500 }
    );
  }
}
