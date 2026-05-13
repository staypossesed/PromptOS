/**
 * lib/prompt-packs.ts
 *
 * Supabase database operations for prompt packs.
 * SERVER-ONLY — never import from Client Components.
 * All queries rely on RLS: users can only see/mutate their own rows.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  PromptPackRecord,
  PromptPackSummary,
  CreatePromptPackBody,
  UpdatePromptPackBody,
} from "@/types/prompt-pack";
import { generateTitleFromIdea } from "@/types/prompt";

// ─── List ─────────────────────────────────────────────────────────────────

export async function listPromptPacks(limit = 50): Promise<{
  data: PromptPackSummary[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_packs")
    .select("id, title, idea, pack_type, prompts, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listPromptPacks]", error.message);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as PromptPackSummary[], error: null };
}

// ─── Get one ──────────────────────────────────────────────────────────────

export async function getPromptPack(id: string): Promise<{
  data: PromptPackRecord | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_packs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { data: null, error: "Pack not found." };
    console.error("[getPromptPack]", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as PromptPackRecord, error: null };
}

// ─── Create ───────────────────────────────────────────────────────────────

export async function createPromptPack(body: CreatePromptPackBody): Promise<{
  data: PromptPackRecord | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Unauthenticated." };

  const title = body.title ?? generateTitleFromIdea(body.idea);

  const { data, error } = await supabase
    .from("prompt_packs")
    .insert({
      user_id: user.id,
      title,
      idea: body.idea,
      pack_type: body.pack_type,
      context: body.context ?? {},
      prompts: body.prompts,
    })
    .select()
    .single();

  if (error) {
    console.error("[createPromptPack]", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as PromptPackRecord, error: null };
}

// ─── Update ───────────────────────────────────────────────────────────────

export async function updatePromptPack(
  id: string,
  body: UpdatePromptPackBody
): Promise<{ data: PromptPackRecord | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_packs")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return { data: null, error: "Pack not found." };
    console.error("[updatePromptPack]", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as PromptPackRecord, error: null };
}

// ─── Delete ───────────────────────────────────────────────────────────────

export async function deletePromptPack(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("prompt_packs").delete().eq("id", id);

  if (error) {
    console.error("[deletePromptPack]", error.message);
    return { error: error.message };
  }

  return { error: null };
}
