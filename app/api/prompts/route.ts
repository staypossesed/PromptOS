import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPrompts, createPrompt } from "@/lib/prompts";
import { validateCreateBody } from "@/types/prompt";
import { linkRunToPrompt } from "@/lib/generation-runs";

// ─── GET /api/prompts ─────────────────────────────────────────────────────
// Returns the authenticated user's prompts, newest first.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { data, error } = await listPrompts();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── POST /api/prompts ────────────────────────────────────────────────────
// Creates a new prompt record. Body validated before insert.

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateCreateBody(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { data, error } = await createPrompt(validation.data);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  // Link the generation run to the saved prompt if the client sent a request_id
  const requestId =
    typeof (body as Record<string, unknown>).request_id === "string"
      ? ((body as Record<string, unknown>).request_id as string)
      : null;
  if (requestId && data?.id) {
    void linkRunToPrompt(requestId, data.id);
  }

  return NextResponse.json({ data }, { status: 201 });
}
