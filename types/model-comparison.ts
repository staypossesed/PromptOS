import type { PromptScore } from "@/types/prompt";

// Full result returned by /api/model-lab/compare (also stored in DB)
export interface ModelLabResult {
  model: string;
  displayName: string;
  shortName: string;
  output: string | null;
  score: PromptScore | null;
  latencyMs: number;
  estimatedCostUSD: number | null;
  error: string | null;
}

// Lightweight shape returned by the history API (output stripped)
export interface ResultSummary {
  model: string;
  shortName: string;
  score: { overall: number } | null;
  latencyMs: number;
  estimatedCostUSD: number | null;
  error: string | null;
}

export interface ModelComparisonRecord {
  id: string;
  user_id: string | null;
  idea: string;
  target_tool: string;
  context: Record<string, string>;
  models_compared: string[];
  results: ModelLabResult[];
  winner_model: string | null;
  winner_reason: string | null;
  created_at: string;
}

export interface ModelComparisonSummary {
  id: string;
  idea: string;
  target_tool: string;
  models_compared: string[];
  winner_model: string | null;
  winner_reason: string | null;
  created_at: string;
  results: ResultSummary[];
}

export interface CreateModelComparisonBody {
  idea: string;
  target_tool: string;
  context?: Record<string, string>;
  models_compared: string[];
  results: ModelLabResult[];
}

export interface UpdateModelComparisonBody {
  winner_model: string;
  winner_reason?: string;
}

export const WINNER_REASONS = [
  "Better structure",
  "More specific",
  "Less bloated",
  "Better Cursor fit",
  "Better examples",
  "Cheaper",
  "Faster",
] as const;

export type WinnerReason = (typeof WINNER_REASONS)[number];
