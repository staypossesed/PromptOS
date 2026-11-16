import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModelV1 } from "ai";
import { resolveModel } from "@/lib/ai/config";
import { boundedProviderFetch } from "@/lib/ai/bounded-fetch";
import type { GeneratorModel } from "./prompt";

export const VENICE_MODEL_ID = "cognitivecomputations/dolphin-mistral-24b-venice-edition";
export interface GeneratorModelOption { value: GeneratorModel; name: string; provider: string; modelId: string; configured: boolean; }
export interface GeneratorConfiguration { models: GeneratorModelOption[]; }
export class GeneratorConfigurationError extends Error {
  readonly code: "MISSING_PROVIDER_KEY" | "MODEL_CONFIGURATION";
  constructor(code: "MISSING_PROVIDER_KEY" | "MODEL_CONFIGURATION") { super(code); this.code = code; this.name = "GeneratorConfigurationError"; }
}
function configuredClaude() {
  const choice = resolveModel();
  // Reuse an existing Claude selection; this private default never selects OpenRouter.
  return choice.provider === "anthropic" ? choice : resolveModel({ model: "claude-sonnet-4-6" });
}
export function generatorConfiguration(): GeneratorConfiguration {
  const models: GeneratorModelOption[] = [];
  try {
    const choice = configuredClaude();
    models.push({ value: "configured", name: choice.config.displayName + " (default)", provider: choice.provider, modelId: choice.model, configured: !!process.env.ANTHROPIC_API_KEY?.trim() });
  } catch {
    models.push({ value: "configured", name: "Claude (default)", provider: "anthropic", modelId: "", configured: false });
  }
  models.push({ value: "venice", name: "Venice Uncensored", provider: "openrouter", modelId: VENICE_MODEL_ID, configured: !!process.env.OPENROUTER_API_KEY?.trim() });
  return { models };
}
export function resolveGeneratorModel(selected: GeneratorModel): { model: LanguageModelV1; provider: string; modelId: string } {
  if (selected === "venice") {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) throw new GeneratorConfigurationError("MISSING_PROVIDER_KEY");
    const client = createOpenRouter({ apiKey, fetch: boundedProviderFetch, headers: { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000", "X-Title": "Umprompt Private Generator" } });
    return { model: client.chat(VENICE_MODEL_ID), provider: "openrouter", modelId: VENICE_MODEL_ID };
  }
  if (selected !== "configured") throw new GeneratorConfigurationError("MODEL_CONFIGURATION");
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new GeneratorConfigurationError("MISSING_PROVIDER_KEY");
  const choice = configuredClaude();
  return { model: choice.config.factory(), provider: choice.provider, modelId: choice.model };
}
