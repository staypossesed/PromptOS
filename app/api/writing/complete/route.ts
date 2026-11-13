import { NextRequest, NextResponse } from "next/server";
import { completeWriting } from "@/lib/ai/complete-writing";
import { guestKey } from "@/lib/guest-access";
import { rateLimit } from "@/lib/rate-limit";
import { eligibleWritingPrefix, MAX_WRITING_PREFIX, sensitiveWritingText, WRITING_CONSENT_VERSION } from "@/lib/writing-suggestions";
import { isSupportedLanguage } from "@/types/language";

export const runtime = "nodejs";
export const maxDuration = 15;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function POST(request: NextRequest) {
  let origin;
  try { origin = new URL(request.headers.get("origin") ?? ""); } catch { return reply("INVALID_ORIGIN", 403); }
  if (origin.origin !== request.nextUrl.origin && !(origin.protocol === request.nextUrl.protocol && origin.host === request.headers.get("host"))) return reply("INVALID_ORIGIN", 403);
  let body;
  try {
    if (Number(request.headers.get("content-length")) > 20000 || !request.headers.get("content-type")?.startsWith("application/json")) return reply("INVALID_REQUEST", 422);
    const reader = request.body?.getReader();
    if (!reader) return reply("INVALID_REQUEST", 400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 20000) { await reader.cancel(); return reply("INVALID_REQUEST", 422); } chunks.push(chunk.value); }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply("INVALID_REQUEST", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply("INVALID_REQUEST", 422);
  if (body.consent !== true || body.consentVersion !== WRITING_CONSENT_VERSION) return reply("CONSENT_REQUIRED", 403);
  if (Object.keys(body).some(key => !["prefix", "language", "consent", "consentVersion"].includes(key)) || typeof body.prefix !== "string" || body.prefix.length > MAX_WRITING_PREFIX || !isSupportedLanguage(body.language)) return reply("INVALID_REQUEST", 422);
  if (sensitiveWritingText(body.prefix)) return NextResponse.json({ data: "", reason: "private" }, { headers });
  if (!eligibleWritingPrefix(body.prefix)) return NextResponse.json({ data: "", reason: "short" }, { headers });
  try {
    const key = guestKey(request.headers);
    const burst = await rateLimit(key, "writing_burst");
    if (!burst.allowed) return reply("SUGGESTION_LIMIT_REACHED", 429);
    const daily = await rateLimit(key, "writing_daily");
    if (!daily.allowed) return reply("SUGGESTION_LIMIT_REACHED", 429);
    // Drafts and completions are never written to workspace history, logs or analytics here.
    // These independent limits do not reserve or consume a free completed result.
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8000)]);
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const cancellation = new AbortController();
      const combined = AbortSignal.any([signal, cancellation.signal]);
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const send = (item: object) => { if (!combined.aborted) controller.enqueue(encoder.encode(JSON.stringify(item) + "\n")); };
          void completeWriting(body.prefix, body.language, combined, data => send({ data, source: "ai", done: false }))
            .then(data => send({ data, source: "ai", done: true }))
            .catch(() => send({ error: "SUGGESTIONS_UNAVAILABLE", done: true }))
            .finally(() => { if (!cancellation.signal.aborted) { try { controller.close(); } catch {} } });
        },
        cancel() { cancellation.abort(); },
      });
      return new Response(stream, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
    }
    const data = await completeWriting(body.prefix, body.language, signal);
    return NextResponse.json({ data, source: "ai" }, { headers });
  } catch { return reply("SUGGESTIONS_UNAVAILABLE", 503); }
}
