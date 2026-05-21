import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, retryAfterMessage } from "@/lib/rate-limit";
import { generatePromptPack } from "@/lib/ai/generate-prompt-pack";
import { isValidPackType } from "@/types/prompt-pack";
export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  const rl = await rateLimit(user.id, "pack");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Pack limit reached. Try again in ${retryAfterMessage(rl.resetAt)}.` },
      { status: 429 }
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

  // ── Generate ────────────────────────────────────────────────────────────
  try {
    const pack = await generatePromptPack({
      idea: idea.trim(),
      pack_type,
      context: (context as Record<string, string> | undefined) ?? {},
      outputLanguage: typeof outputLanguage === "string" ? outputLanguage : undefined,
    });

    console.info("[pack:generate]", { timestamp: new Date().toISOString(), userId: user.id, pack_type, prompt_count: pack.prompts.length });

    return NextResponse.json({ data: pack });
  } catch (err) {
    console.error("[pack:generate]", { timestamp: new Date().toISOString(), userId: user.id, pack_type, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Pack generation failed. Please try again." },
      { status: 500 }
    );
  }
}
