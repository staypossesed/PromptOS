/**
 * lib/ai/providers.ts
 *
 * Central registry of AI providers and models.
 * SERVER-ONLY. Reads env vars at runtime. Never import from a Client Component.
 *
 * Adding a new model is two steps:
 *   1. Add the literal to ProviderId / ModelId.
 *   2. Add an entry to MODEL_REGISTRY with its provider, display name, and factory.
 *
 * The factory returns the model handle the Vercel AI SDK passes to streamText().
 * We isolate the SDK-specific shape behind LanguageModelV1 so the rest of the
 * codebase doesn't care which provider is in use.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModelV1 } from "ai";

// ─── Type-level surface ────────────────────────────────────────────────────

export type ProviderId = "anthropic" | "openrouter";

export type ModelId =
  | "claude-sonnet-4-6"
  | "claude-opus-4-7"      // expensive, but available — useful for benchmarking
  | "claude-haiku-4-5"     // cheap fallback
  | "moonshotai/kimi-k2.6";

export interface ModelConfig {
  id: ModelId;
  provider: ProviderId;
  displayName: string;
  /** Used in logs, scoring comparisons, and DB rows */
  shortName: string;
  /** Cost hints — purely informational, no UI yet */
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  /** Build the SDK model handle. Throws a typed error if API key missing. */
  factory: () => LanguageModelV1;
}

// ─── Provider factories (memoised) ─────────────────────────────────────────
// We instantiate the provider client once per process, lazily.
// The createX() functions are cheap but we still avoid repeated allocs.

let _anthropic: ReturnType<typeof createAnthropic> | null = null;
function getAnthropic() {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigError(
        "anthropic",
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (server-only — do NOT prefix with NEXT_PUBLIC_)."
      );
    }
    _anthropic = createAnthropic({ apiKey });
  }
  return _anthropic;
}

let _openrouter: ReturnType<typeof createOpenRouter> | null = null;
function getOpenRouter() {
  if (!_openrouter) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigError(
        "openrouter",
        "OPENROUTER_API_KEY is not set. Get one at https://openrouter.ai/keys and add it to .env.local."
      );
    }
    _openrouter = createOpenRouter({
      apiKey,
      // OpenRouter recommends including these for analytics/ranking on their side.
      // Harmless if missing.
      headers: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Umprompt",
      },
    });
  }
  return _openrouter;
}

// ─── Typed config error so callers can return clean 503 responses ──────────

export class ProviderConfigError extends Error {
  constructor(public provider: ProviderId, message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

// ─── The registry ──────────────────────────────────────────────────────────

export const MODEL_REGISTRY: Record<ModelId, ModelConfig> = {
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.6",
    shortName: "sonnet-4-6",
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    factory: () => getAnthropic()("claude-sonnet-4-6"),
  },
  "claude-opus-4-7": {
    id: "claude-opus-4-7",
    provider: "anthropic",
    displayName: "Claude Opus 4.7",
    shortName: "opus-4-7",
    inputCostPerMTok: 15,
    outputCostPerMTok: 75,
    factory: () => getAnthropic()("claude-opus-4-7"),
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    displayName: "Claude Haiku 4.5",
    shortName: "haiku-4-5",
    inputCostPerMTok: 1,
    outputCostPerMTok: 5,
    factory: () => getAnthropic()("claude-haiku-4-5-20251001"),
  },
  "moonshotai/kimi-k2.6": {
    id: "moonshotai/kimi-k2.6",
    provider: "openrouter",
    displayName: "Kimi K2.6 (Moonshot AI)",
    shortName: "kimi-k2.6",
    inputCostPerMTok: 0.74,
    outputCostPerMTok: 3.49,
    // OpenRouter routes this slug to Moonshot's hosted Kimi K2.6.
    factory: () => getOpenRouter().chat("moonshotai/kimi-k2.6"),
  },
};

// ─── Lookup helpers ────────────────────────────────────────────────────────

export function getModelConfig(modelId: string): ModelConfig {
  if (!(modelId in MODEL_REGISTRY)) {
    throw new ProviderConfigError(
      "anthropic", // arbitrary — caller will see the message
      `Unknown model: ${modelId}. Registered models: ${Object.keys(MODEL_REGISTRY).join(", ")}`
    );
  }
  return MODEL_REGISTRY[modelId as ModelId];
}

export function isValidModelId(value: unknown): value is ModelId {
  return typeof value === "string" && value in MODEL_REGISTRY;
}

export function isValidProviderId(value: unknown): value is ProviderId {
  return value === "anthropic" || value === "openrouter";
}

/** All registered models for a given provider — useful for /admin debug pages later */
export function modelsForProvider(provider: ProviderId): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.provider === provider);
}
