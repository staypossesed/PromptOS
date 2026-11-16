import { type NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { canUseStudyCoach } from "@/lib/study-coach/access";
import { validateStudyRequest, extractStudyCheckpoint, MAX_STUDY_REQUEST_BYTES } from "@/lib/study-coach/course";
import { STUDY_COACH_SYSTEM_PROMPT, STUDY_COACH_CHECKPOINT_INSTRUCTION } from "@/lib/study-coach/system-prompt";
import { resolveModel } from "@/lib/ai/config";
import { outputMatchesLanguage } from "@/lib/ai/output-policy";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const reply = (error: string, status: number, extraHeaders: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { ...headers, ...extraHeaders } });

function sameOrigin(request: NextRequest): boolean {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    return origin.origin === request.nextUrl.origin ||
      (origin.protocol === request.nextUrl.protocol && origin.host === request.headers.get("host"));
  } catch { return false; }
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_STUDY_REQUEST_BYTES) throw new Error("REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_REQUEST");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_STUDY_REQUEST_BYTES) { await reader.cancel(); throw new Error("REQUEST_TOO_LARGE"); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return reply("UNAUTHENTICATED", 401);
    if (!canUseStudyCoach(user)) return reply("FORBIDDEN", 403);
    if (!sameOrigin(request)) return reply("INVALID_ORIGIN", 403);
    const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== "application/json") return reply("INVALID_REQUEST", 415);
    let body: unknown;
    try { body = await readBody(request); }
    catch (error) { return reply(error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST", 400); }
    const input = validateStudyRequest(body);
    if (!input) return reply("INVALID_REQUEST", 422);

    for (const action of ["study_coach_burst", "study_coach"] as const) {
      const limit = await rateLimit(user.id, action);
      if (!limit.allowed) return reply("RATE_LIMITED", 429, { "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) });
    }

    const choice = resolveModel();
    const result = await generateText({
      model: choice.config.factory(),
      system: STUDY_COACH_SYSTEM_PROMPT + (input.intent === "checkpoint" ? "\n\n" + STUDY_COACH_CHECKPOINT_INSTRUCTION : ""),
      messages: input.messages,
      maxTokens: 2000,
      temperature: 0.3,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(50000)]),
    });
    const message = result.text.trim();
    if (!message || message.length > 12000 || !outputMatchesLanguage(message, "en")) return reply("COACH_UNAVAILABLE", 503);
    const checkpoint = extractStudyCheckpoint(message);
    if (input.intent === "checkpoint" && !checkpoint) return reply("CHECKPOINT_UNAVAILABLE", 503);
    // No prompt/history, analytics, profile, billing or generation-run writes.
    return NextResponse.json({ message, checkpoint }, { headers });
  } catch {
    // Keep provider details and conversation content out of logs and responses.
    return reply("COACH_UNAVAILABLE", 503);
  }
}
