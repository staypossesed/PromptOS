/**
 * PATCH /api/model-lab/comparisons/[id]
 *
 * Updates winner_model and winner_reason on a saved comparison.
 * Auth-protected. RLS enforces per-user isolation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateModelComparisonWinner } from "@/lib/model-comparisons";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.winner_model || typeof b.winner_model !== "string") {
    return NextResponse.json({ error: "'winner_model' is required." }, { status: 422 });
  }

  const { error } = await updateModelComparisonWinner(id, {
    winner_model: b.winner_model as string,
    winner_reason:
      typeof b.winner_reason === "string" && b.winner_reason.trim()
        ? b.winner_reason.trim()
        : undefined,
  });

  if (error === "Comparison not found.") {
    return NextResponse.json({ error }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
