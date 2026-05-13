/**
 * GET  /api/model-lab/comparisons  — list last 10 comparisons (metadata only, no prompt text)
 * POST /api/model-lab/comparisons  — save a new comparison result
 *
 * Auth-protected. Prompt output is stored in DB (user's own data) but never sent to PostHog.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createModelComparison, listModelComparisons } from "@/lib/model-comparisons";
import type { CreateModelComparisonBody } from "@/types/model-comparison";

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const { data, error } = await listModelComparisons(10);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ data });
}

// ─── POST ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
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

  if (!b.idea || typeof b.idea !== "string" || !(b.idea as string).trim()) {
    return NextResponse.json({ error: "'idea' is required." }, { status: 422 });
  }
  if (!b.target_tool || typeof b.target_tool !== "string") {
    return NextResponse.json({ error: "'target_tool' is required." }, { status: 422 });
  }
  if (!Array.isArray(b.models_compared) || (b.models_compared as unknown[]).length === 0) {
    return NextResponse.json({ error: "'models_compared' must be a non-empty array." }, { status: 422 });
  }
  if (!Array.isArray(b.results) || (b.results as unknown[]).length === 0) {
    return NextResponse.json({ error: "'results' must be a non-empty array." }, { status: 422 });
  }

  const createBody: CreateModelComparisonBody = {
    idea: (b.idea as string).trim(),
    target_tool: b.target_tool as string,
    context:
      typeof b.context === "object" && b.context !== null
        ? (b.context as Record<string, string>)
        : {},
    models_compared: b.models_compared as string[],
    results: b.results as CreateModelComparisonBody["results"],
  };

  const { data, error } = await createModelComparison(createBody);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
