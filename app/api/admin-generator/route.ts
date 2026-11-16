import { type NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { canUseAdminGenerator } from "@/lib/admin-generator/access";
import { buildAdminGeneratorPrompt, isGeneratorRefusal, parseGeneratorInput } from "@/lib/admin-generator/prompt";
import { generatorConfiguration, resolveGeneratorModel } from "@/lib/admin-generator/provider";
import { GENERATOR_ERRORS, generatorErrorCode, type GeneratorErrorCode } from "@/lib/admin-generator/errors";
import { outputMatchesLanguage } from "@/lib/ai/output-policy";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_REQUEST_BYTES = 32768;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
function failure(error: GeneratorErrorCode, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json({ error, message: GENERATOR_ERRORS[error] }, { status, headers: { ...headers, ...extra } });
}
async function authenticatedOwner() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: failure("UNAUTHENTICATED", 401) } as const;
  if (!canUseAdminGenerator(user)) return { response: failure("FORBIDDEN", 403) } as const;
  return { user } as const;
}
function sameOrigin(request: NextRequest): boolean {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    return origin.origin === request.nextUrl.origin || (origin.protocol === request.nextUrl.protocol && origin.host === request.headers.get("host"));
  } catch { return false; }
}
async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) throw new Error("REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_REQUEST");
  const decoder = new TextDecoder();
  let size = 0; let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new Error("REQUEST_TOO_LARGE"); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
export async function GET() {
  try {
    const access = await authenticatedOwner();
    if ("response" in access) return access.response;
    return NextResponse.json(generatorConfiguration(), { headers });
  } catch { return failure("GENERATOR_UNAVAILABLE", 503); }
}
export async function POST(request: NextRequest) {
  let providerSignal: AbortSignal | undefined;
  try {
    const access = await authenticatedOwner();
    if ("response" in access) return access.response;
    if (!sameOrigin(request)) return failure("INVALID_ORIGIN", 403);
    if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return failure("INVALID_REQUEST", 415);
    let body: unknown;
    try { body = await readBody(request); }
    catch (error) { return failure(error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST", 400); }
    const input = parseGeneratorInput(body);
    if (!input) return failure("INVALID_REQUEST", 422);
    for (const action of ["admin_generator_burst", "admin_generator"] as const) {
      const limit = await rateLimit(access.user.id, action);
      if (!limit.allowed) return failure("RATE_LIMITED", 429, { "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) });
    }
    const selected = resolveGeneratorModel(input.model);
    const { system, prompt } = buildAdminGeneratorPrompt(input);
    providerSignal = AbortSignal.any([request.signal, AbortSignal.timeout(input.action === "check" ? 15000 : 45000)]);
    const result = await generateText({
      model: selected.model, system, prompt, abortSignal: providerSignal,
      maxRetries: 0, maxTokens: input.action === "check" ? 8 : 2400, temperature: input.action === "check" ? 0 : 0.6,
    });
    if (result.finishReason === "content-filter") return failure("PROVIDER_DECLINED", 422);
    if (result.finishReason === "error") return failure("GENERATOR_UNAVAILABLE", 503);
    const text = result.text.trim();
    if (!text) return failure("EMPTY_RESPONSE", 503);
    if (isGeneratorRefusal(text)) return failure("PROVIDER_DECLINED", 422);
    if (input.action === "check") return NextResponse.json({ ok: true, provider: selected.provider, model: selected.modelId, checkedAt: new Date().toISOString() }, { headers });
    if (result.finishReason === "length" || text.length > 16000) return failure("OUTPUT_TRUNCATED", 503);
    if (!outputMatchesLanguage(text, input.language)) return failure("OUTPUT_LANGUAGE_MISMATCH", 503);
    // No extra application content-screening step; upstream model/provider behavior still applies.
    // Prompts are not saved to history, analytics or generation-run logs.
    return NextResponse.json({ prompt: text, provider: selected.provider, model: selected.modelId }, { headers });
  } catch (error) {
    const code = generatorErrorCode(error, providerSignal?.aborted);
    return failure(code, code === "PROVIDER_RATE_LIMIT" ? 429 : 503);
  }
}
