import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clarifyIdea } from "@/lib/ai/clarify-idea";
import { isTaskCategory } from "@/lib/task-categories";
import { rateLimit } from "@/lib/rate-limit";
import { getBillingStatus, checkUsageLimits } from "@/lib/billing";
import { parsePromptContext } from "@/lib/prompt-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body.idea !== "string" || !body.idea.trim() || body.idea.length > 4000 || !isTaskCategory(body.category)) {
    return NextResponse.json({ error: "Please provide an idea of up to 4000 characters and a valid category." }, { status: 422 });
  }
  const context = parsePromptContext(body.context);
  if (context.error) return NextResponse.json({ error: context.error }, { status: 422 });
  const usage = checkUsageLimits(await getBillingStatus(supabase, user.id));
  if (!usage.allowed) return NextResponse.json({ error: usage.message, upgradeRequired: usage.errorCode === "FREE_LIMIT_REACHED" }, { status: usage.status });
  const rate = await rateLimit(user.id, "clarify");
  if (!rate.allowed) return NextResponse.json({ error: "Too many follow-up requests. You can still generate directly." }, { status: 429 });
  try {
    const language = typeof body.outputLanguage === "string" && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(body.outputLanguage) ? body.outputLanguage : "en";
    return NextResponse.json({ data: await clarifyIdea(body.idea.trim(), body.category, language, context.data) });
  } catch {
    return NextResponse.json({ error: "Follow-up questions are unavailable. You can still generate directly." }, { status: 503 });
  }
}
