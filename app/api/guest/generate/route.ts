import { NextRequest, NextResponse } from "next/server";
import { generatePromptText } from "@/lib/ai/generate-prompt";
import { canExpandIdea } from "@/lib/prompt-editing";
import { parsePromptContext } from "@/lib/prompt-context";
import { isSupportedLanguage } from "@/types/language";
import { guestKey, reserveGuest, finishGuest, type GuestReservation } from "@/lib/guest-access";

export const runtime = "nodejs";
export const maxDuration = 60;
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: NextRequest) {
  // Next's local server can normalize 127.0.0.1 to localhost internally.
  // Match the actual request Host as well, without accepting another origin.
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
    let size = 0;
    let text = "";
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16000) { await reader.cancel(); return reply("INVALID_REQUEST", 422); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    if (text.length > 12000) return reply("INVALID_REQUEST", 422);
    body = JSON.parse(text);
  } catch { return reply("INVALID_REQUEST", 400); }
  if (!body || typeof body.idea !== "string" || body.idea.length > 4000 || !canExpandIdea(body.idea) || !isSupportedLanguage(body.outputLanguage)) return reply("INVALID_REQUEST", 422);
  const parsed = parsePromptContext(body.context);
  if (!parsed.data) return reply("INVALID_REQUEST", 422);
  let reservation: GuestReservation | null = null;
  let phase = "reserve";
  try {
    const held = await reserveGuest(guestKey(request.headers));
    if (held === "used" || held === "busy") return reply(held === "used" ? "GUEST_LIMIT_REACHED" : "GUEST_BUSY", 429);
    reservation = held;
    const { category, clarifications, delivery } = parsed.data;
    phase = "generate";
    const result = await generatePromptText({
      idea: body.idea, target_tool: "claude", outputLanguage: body.outputLanguage,
      context: { universal: true, category, clarifications, delivery },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(50000)]),
    });
    if (!result.text.trim() || result.text.length > 16000) throw new Error("Empty result");
    phase = "complete";
    await finishGuest(reservation, true);
    reservation = null;
    return NextResponse.json({ data: result.text }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = (error as { statusCode?: unknown })?.statusCode;
    console.error("[guest:generate]", { phase, status: typeof status === "number" ? status : undefined });
    if (reservation) { try { await finishGuest(reservation, false); } catch {} }
    return reply("SERVICE_UNAVAILABLE", 503);
  }
}
