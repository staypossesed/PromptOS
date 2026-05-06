import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrompt, updatePrompt, deletePrompt } from "@/lib/prompts";
import { validateUpdateBody } from "@/types/prompt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET /api/prompts/[id] ────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { data, error } = await getPrompt(id);

  if (error === "Prompt not found.") {
    return NextResponse.json({ error }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── PATCH /api/prompts/[id] ──────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

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

  const validation = validateUpdateBody(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { data, error } = await updatePrompt(id, validation.data);

  if (error === "Prompt not found.") {
    return NextResponse.json({ error }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── DELETE /api/prompts/[id] ─────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { error } = await deletePrompt(id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
