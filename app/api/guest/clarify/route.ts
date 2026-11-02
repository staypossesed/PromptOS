import { NextRequest, NextResponse } from "next/server";
import { clarifyIdea } from "@/lib/ai/clarify-idea";
import { guestKey } from "@/lib/guest-access";
import { rateLimit } from "@/lib/rate-limit";
import { canExpandIdea } from "@/lib/prompt-editing";
import { isSupportedLanguage } from "@/types/language";

export const runtime = "nodejs";
export const maxDuration = 30;
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: NextRequest) {
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    sameOrigin = origin.origin === request.nextUrl.origin ||
      (origin.protocol === request.nextUrl.protocol && origin.host === request.headers.get("host"));
  } catch {}
  if (!sameOrigin) return reply("INVALID_ORIGIN", 403);
  let body;
  try {
    if (Number(request.headers.get("content-length")) > 16000) return reply("INVALID_REQUEST", 422);
    const reader = request.body?.getReader();
    if (!reader) return reply("INVALID_REQUEST", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16000) { await reader.cancel(); return reply("INVALID_REQUEST", 422); }
      chunks.push(chunk.value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply("INVALID_REQUEST", 400); }
  if (!body || typeof body.idea !== "string" || body.idea.length > 4000 || !canExpandIdea(body.idea) || !isSupportedLanguage(body.outputLanguage)) return reply("INVALID_REQUEST", 422);
  try {
    // Independent from the free-result reservation: questions never consume the trial.
    const rate = await rateLimit(guestKey(request.headers), "guest_clarify");
    if (!rate.allowed) return reply("QUESTION_LIMIT_REACHED", 429);
    // Never accept guest model overrides, private profiles, or arbitrary context.
    const data = await clarifyIdea(body.idea.trim(), "auto", body.outputLanguage, { universal: true }, AbortSignal.any([request.signal, AbortSignal.timeout(18000)]));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return reply("QUESTIONS_UNAVAILABLE", 503); }
}
