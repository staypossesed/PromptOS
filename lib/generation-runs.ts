/**
 * lib/generation-runs.ts — Server-side helpers for generation_runs table.
 *
 * All writes use the service-role admin client (bypasses RLS).
 * Never call these from Client Components or expose the admin client to the browser.
 */

import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type GenerationMode = "single" | "pack" | "optimize";

export interface GenerationRunStartData {
  user_id: string | null;
  request_id: string;
  mode: GenerationMode;
  target_tool?: string;
  pack_type?: string;
  output_language?: string;
  model?: string;
  user_idea: string;
  context?: Record<string, unknown>;
  input_chars: number;
}

export interface GenerationRunSuccessData {
  generated_output?: string;
  generated_json?: Record<string, unknown>;
  score?: Record<string, unknown>;
  latency_ms: number;
  output_chars: number;
}

export interface GenerationRunFailData {
  error_code?: string;
  error_message?: string;
  latency_ms: number;
}

export function newRequestId(): string {
  return randomUUID();
}

export async function insertGenerationRun(data: GenerationRunStartData): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("generation_runs")
      .insert({ ...data, status: "started" })
      .select("id")
      .single();
    if (error) throw error;
    return (row as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

export async function markGenerationSuccess(
  runId: string,
  data: GenerationRunSuccessData
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("generation_runs")
      .update({ ...data, status: "success", updated_at: new Date().toISOString() })
      .eq("id", runId);
  } catch {
    // Non-critical — never crash the generation flow
  }
}

export async function markGenerationFailed(
  runId: string,
  data: GenerationRunFailData
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("generation_runs")
      .update({ ...data, status: "failed", updated_at: new Date().toISOString() })
      .eq("id", runId);
  } catch {}
}

export async function linkRunToPrompt(requestId: string, promptId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("generation_runs")
      .update({ saved_prompt_id: promptId, updated_at: new Date().toISOString() })
      .eq("request_id", requestId);
  } catch {}
}

export async function linkRunToPack(requestId: string, packId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("generation_runs")
      .update({ saved_pack_id: packId, updated_at: new Date().toISOString() })
      .eq("request_id", requestId);
  } catch {}
}
