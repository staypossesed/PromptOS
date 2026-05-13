/**
 * lib/model-comparisons.ts
 *
 * Supabase DB operations for the Model Lab evaluation dataset.
 * SERVER-ONLY — never import from Client Components.
 * All queries rely on RLS: users can only see/mutate their own rows.
 * Full prompt output is stored in the DB (user's own data) but is never sent to PostHog.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ModelComparisonSummary,
  CreateModelComparisonBody,
  UpdateModelComparisonBody,
  ModelLabResult,
} from "@/types/model-comparison";

// ─── List (strips prompt output from results for lightweight response) ─────

export async function listModelComparisons(limit = 10): Promise<{
  data: ModelComparisonSummary[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("model_comparisons")
    .select("id, idea, target_tool, models_compared, winner_model, winner_reason, created_at, results")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listModelComparisons]", error.message);
    return { data: [], error: error.message };
  }

  const summaries: ModelComparisonSummary[] = (data ?? []).map((row) => ({
    id: row.id as string,
    idea: row.idea as string,
    target_tool: row.target_tool as string,
    models_compared: row.models_compared as string[],
    winner_model: row.winner_model as string | null,
    winner_reason: row.winner_reason as string | null,
    created_at: row.created_at as string,
    results: ((row.results ?? []) as ModelLabResult[]).map((r) => ({
      model: r.model,
      shortName: r.shortName,
      score: r.score ? { overall: r.score.overall } : null,
      latencyMs: r.latencyMs,
      estimatedCostUSD: r.estimatedCostUSD,
      error: r.error,
    })),
  }));

  return { data: summaries, error: null };
}

// ─── Create ───────────────────────────────────────────────────────────────

export async function createModelComparison(
  body: CreateModelComparisonBody
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Unauthenticated." };

  const { data, error } = await supabase
    .from("model_comparisons")
    .insert({
      user_id: user.id,
      idea: body.idea,
      target_tool: body.target_tool,
      context: body.context ?? {},
      models_compared: body.models_compared,
      results: body.results,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createModelComparison]", error.message);
    return { data: null, error: error.message };
  }

  return { data: { id: data.id as string }, error: null };
}

// ─── Update winner ─────────────────────────────────────────────────────────

export async function updateModelComparisonWinner(
  id: string,
  body: UpdateModelComparisonBody
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("model_comparisons")
    .update({
      winner_model: body.winner_model,
      winner_reason: body.winner_reason ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "PGRST116") return { error: "Comparison not found." };
    console.error("[updateModelComparisonWinner]", error.message);
    return { error: error.message };
  }

  return { error: null };
}
