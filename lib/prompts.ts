/**
 * lib/prompts.ts
 *
 * All Supabase database operations for prompts.
 * These helpers are SERVER-ONLY — they import createClient from lib/supabase/server.
 * Never import this file from Client Components.
 *
 * All queries rely on Supabase RLS:
 *   - The authenticated user can only see/mutate their own rows.
 *   - We never pass a service-role key or bypass RLS.
 */

import { createClient } from "@/lib/supabase/server";
import { resolveModel } from "@/lib/ai/config";
import type {
  PromptRecord,
  PromptSummary,
  CreatePromptBody,
  UpdatePromptBody,
} from "@/types/prompt";
import { generateTitleFromIdea } from "@/types/prompt";

// ─── List ─────────────────────────────────────────────────────────────────

export async function listPrompts(limit = 50): Promise<{
  data: PromptSummary[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("id, title, idea, target_tool, score, generated_prompt, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listPrompts]", error.message);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as PromptSummary[], error: null };
}

// ─── Get one ──────────────────────────────────────────────────────────────

export async function getPrompt(id: string): Promise<{
  data: PromptRecord | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // "PGRST116" = 0 rows returned by .single() — clean 404
    if (error.code === "PGRST116") return { data: null, error: "Prompt not found." };
    console.error("[getPrompt]", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as PromptRecord, error: null };
}

// ─── Create ───────────────────────────────────────────────────────────────

export async function createPrompt(body: CreatePromptBody): Promise<{
  data: PromptRecord | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Verify we have an authenticated user — RLS also enforces this, but
  // an explicit check gives a cleaner error message.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Unauthenticated." };

  const title = body.title ?? generateTitleFromIdea(body.idea);

  const { data, error } = await supabase
    .from("prompts")
    .insert({
      user_id: user.id,
      title,
      idea: body.idea,
      context: body.context ?? {},
      target_tool: body.target_tool,
      generated_prompt: body.generated_prompt,
      score: body.score ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[createPrompt]", error.message);
    return { data: null, error: error.message };
  }

  // Log a generation record (best-effort, no rollback if this fails)
  const { model: defaultModel } = resolveModel();
  await supabase.from("prompt_generations").insert({
    user_id: user.id,
    prompt_id: (data as PromptRecord).id,
    model: defaultModel,
    tokens_used: null,
    latency_ms: null,
  });

  return { data: data as PromptRecord, error: null };
}

// ─── Update ───────────────────────────────────────────────────────────────

export async function updatePrompt(
  id: string,
  body: UpdatePromptBody
): Promise<{ data: PromptRecord | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return { data: null, error: "Prompt not found." };
    console.error("[updatePrompt]", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as PromptRecord, error: null };
}

// ─── Delete ───────────────────────────────────────────────────────────────

export async function deletePrompt(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("prompts").delete().eq("id", id);

  if (error) {
    console.error("[deletePrompt]", error.message);
    return { error: error.message };
  }

  return { error: null };
}
