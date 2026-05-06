/**
 * lib/ai/config.ts
 *
 * Single place that resolves which model to use for a given request.
 * Reads DEFAULT_AI_PROVIDER and DEFAULT_AI_MODEL from env at runtime,
 * with hard-coded sensible fallbacks if either is missing or malformed.
 */

import {
  MODEL_REGISTRY,
  isValidModelId,
  isValidProviderId,
  getModelConfig,
  type ModelId,
  type ProviderId,
  type ModelConfig,
} from "@/lib/ai/providers";

// ─── Hard-coded fallbacks ──────────────────────────────────────────────────
// If the env is missing or invalid, these win. Sonnet 4.6 was chosen as the
// default per the Day 5 prep brief.

const FALLBACK_PROVIDER: ProviderId = "anthropic";
const FALLBACK_MODEL: ModelId = "claude-sonnet-4-6";

// ─── Resolved-default cache (computed once per process) ────────────────────

let _resolved: { provider: ProviderId; model: ModelId } | null = null;

function resolveDefaults(): { provider: ProviderId; model: ModelId } {
  if (_resolved) return _resolved;

  const envProvider = process.env.DEFAULT_AI_PROVIDER;
  const envModel = process.env.DEFAULT_AI_MODEL;

  let provider: ProviderId = FALLBACK_PROVIDER;
  let model: ModelId = FALLBACK_MODEL;

  if (envModel && isValidModelId(envModel)) {
    model = envModel;
    // If the model is registered, force-pin its provider from the registry.
    // The env shouldn't be able to disagree with the registry on this —
    // it protects against typos like:
    //   DEFAULT_AI_PROVIDER=openrouter  DEFAULT_AI_MODEL=claude-sonnet-4-6
    provider = getModelConfig(model).provider;
  } else if (envModel) {
    console.warn(
      `[ai/config] DEFAULT_AI_MODEL="${envModel}" is not registered. ` +
        `Falling back to ${FALLBACK_MODEL}.`
    );
  } else if (envProvider && isValidProviderId(envProvider)) {
    // Only the provider is set, no model — keep the fallback model only if
    // it belongs to that provider, otherwise stay on full fallbacks.
    if (getModelConfig(FALLBACK_MODEL).provider === envProvider) {
      provider = envProvider;
    } else {
      console.warn(
        `[ai/config] DEFAULT_AI_PROVIDER="${envProvider}" is set but no ` +
          `DEFAULT_AI_MODEL was provided. Falling back to ${FALLBACK_MODEL}.`
      );
    }
  } else if (envProvider) {
    console.warn(
      `[ai/config] DEFAULT_AI_PROVIDER="${envProvider}" is invalid. ` +
        `Valid: anthropic, openrouter. Falling back to ${FALLBACK_PROVIDER}.`
    );
  }

  _resolved = { provider, model };
  return _resolved;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface ResolvedModelChoice {
  provider: ProviderId;
  model: ModelId;
  config: ModelConfig;
}

/**
 * Resolve the model to use for a request.
 *
 * Optional override lets the caller explicitly request a specific model.
 * This is what Day 5 will use to A/B compare Sonnet vs Kimi: the route
 * accepts an optional { provider, model } body and forwards it here.
 *
 * Throws on invalid overrides — silent fallback would make A/B tests unreliable.
 */
export function resolveModel(
  override?: { provider?: string; model?: string }
): ResolvedModelChoice {
  // No override → use env defaults
  if (!override?.model && !override?.provider) {
    const { provider, model } = resolveDefaults();
    return { provider, model, config: getModelConfig(model) };
  }

  // Explicit model override — must be registered
  if (override.model) {
    if (!isValidModelId(override.model)) {
      const registered = Object.keys(MODEL_REGISTRY).join(", ");
      throw new Error(
        `Invalid model override: "${override.model}". Registered models: ${registered}`
      );
    }
    const config = getModelConfig(override.model);

    // If they also passed a provider, it must match the model's registered provider.
    if (override.provider && override.provider !== config.provider) {
      throw new Error(
        `Provider mismatch: model "${override.model}" belongs to provider ` +
          `"${config.provider}", but override specified "${override.provider}".`
      );
    }

    return { provider: config.provider, model: config.id, config };
  }

  // Provider-only override is intentionally NOT supported — would be ambiguous.
  throw new Error(
    "Invalid model override. Pass { provider, model } together, or just { model }."
  );
}

/** For tests only — clears the cached defaults so the next resolveDefaults() re-reads env. */
export function __resetConfigCacheForTests() {
  _resolved = null;
}
