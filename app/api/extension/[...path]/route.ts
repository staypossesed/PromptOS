import { NextRequest, NextResponse } from "next/server";
import { createExtensionClient, readBearerToken } from "@/lib/extension-auth";
import { generateForClient } from "@/lib/api/generate";
import { optimizeForClient } from "@/lib/api/optimize";
import { scoreForClient } from "@/lib/api/score";
import { listPrompts } from "@/lib/prompts";
import { validateCreateBody } from "@/types/prompt";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function handle(request: NextRequest) {
  const token = readBearerToken(request);
  if (!token) return NextResponse.json({ error: "Sign in to Umprompt again." }, { status: 401 });
  const supabase = createExtensionClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Sign in to Umprompt again." }, { status: 401 });

  const path = request.nextUrl.pathname.replace(/^\/api\/extension\//, "");
  if (request.method === "GET" && path === "status") {
    return NextResponse.json({ data: await getBillingStatus(supabase, user.id) });
  }
  if (request.method === "GET" && path === "prompts") {
    const { data, error } = await listPrompts(50, supabase);
    return NextResponse.json(error ? { error: "Could not load your history." } : { data }, { status: error ? 500 : 200 });
  }
  if (request.method !== "POST" && request.method !== "PUT") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 512000) { await reader.cancel(); return NextResponse.json({ error: "Request is too long." }, { status: 413 }); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const forwarded = new NextRequest(request.url, { method: request.method, headers: request.headers, body: bytes, signal: request.signal });
  if (request.method === "POST") {
    if (path === "generate") return generateForClient(forwarded, supabase);
    if (path === "optimize") return optimizeForClient(forwarded, supabase);
    if (path === "score") return scoreForClient(forwarded, supabase);
  }
  const id = path.startsWith("prompts/") ? path.slice(8) : "";
  if (request.method !== "PUT" || !uuid.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: unknown;
  try { body = await forwarded.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const validated = validateCreateBody(body);
  if (!validated.valid) return NextResponse.json({ error: validated.error }, { status: 422 });
  const value = validated.data;
  if (value.idea.length > 4000 || value.generated_prompt.length > 16000 || (value.title?.length ?? 0) > 160) {
    return NextResponse.json({ error: "Prompt is too long." }, { status: 422 });
  }
  // Stable draft IDs make Save retries safe; RLS checks existing and new owners.
  const { data, error } = await supabase.from("prompts").upsert({
    ...value, id, user_id: user.id, title: value.title ?? value.idea.slice(0, 60),
    context: value.context ?? {}, score: value.score ?? null,
  }, { onConflict: "id" }).select("id, updated_at").single();
  return NextResponse.json(error ? { error: "Could not save this prompt. Please try again." } : { data }, { status: error ? 500 : 200 });
}

async function respond(request: NextRequest) {
  try {
    const response = await handle(request);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Umprompt is unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export const GET = respond;
export const POST = respond;
export const PUT = respond;
