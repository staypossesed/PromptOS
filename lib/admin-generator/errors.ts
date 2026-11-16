export type GeneratorErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_ORIGIN" | "INVALID_REQUEST" | "REQUEST_TOO_LARGE" | "RATE_LIMITED" | "MISSING_PROVIDER_KEY" | "MODEL_CONFIGURATION" | "PROVIDER_AUTH" | "PROVIDER_BALANCE" | "PROVIDER_RATE_LIMIT" | "MODEL_UNAVAILABLE" | "PROVIDER_DECLINED" | "OUTPUT_LANGUAGE_MISMATCH" | "OUTPUT_TRUNCATED" | "EMPTY_RESPONSE" | "PROVIDER_TIMEOUT" | "GENERATOR_UNAVAILABLE";
export const GENERATOR_ERRORS: Record<GeneratorErrorCode, string> = {
  UNAUTHENTICATED: "Sign in again with the account authorized for this private generator.",
  FORBIDDEN: "This private generator is not available for this account.",
  INVALID_ORIGIN: "The request must come from this Umprompt website.",
  INVALID_REQUEST: "Check your idea and generator settings, then try again.",
  REQUEST_TOO_LARGE: "The request is too large. Shorten the idea or additional constraints.",
  RATE_LIMITED: "The generator request limit has been reached. Keep your draft and try again later.",
  MISSING_PROVIDER_KEY: "The selected provider has no server API key configured. Venice requires OPENROUTER_API_KEY; the configured default requires its provider key.",
  MODEL_CONFIGURATION: "The selected model is not configured correctly on the server.",
  PROVIDER_AUTH: "The provider rejected its API key. Update that provider's server configuration.",
  PROVIDER_BALANCE: "The provider account needs credits or has reached its spending limit.",
  PROVIDER_RATE_LIMIT: "The provider is rate limiting requests. Keep your draft and retry later.",
  MODEL_UNAVAILABLE: "The selected model is unavailable from the provider. No other model was substituted.",
  PROVIDER_DECLINED: "The selected provider or model declined this request. No prompt was generated.",
  OUTPUT_LANGUAGE_MISMATCH: "The provider returned a different language. Your previous prompt is unchanged; retry with the selected language.",
  OUTPUT_TRUNCATED: "The provider stopped before completing the prompt. Ask for a shorter result and retry.",
  EMPTY_RESPONSE: "The provider returned no usable text. Your previous prompt is unchanged.",
  PROVIDER_TIMEOUT: "The provider took too long to respond. Your draft and previous prompt are still here.",
  GENERATOR_UNAVAILABLE: "The generator could not finish this request. Your draft and previous prompt are still here.",
};
export function generatorErrorCode(error: unknown, aborted = false): GeneratorErrorCode {
  if (aborted || (error instanceof Error && /AbortError|TimeoutError/.test(error.name))) return "PROVIDER_TIMEOUT";
  if (error && typeof error === "object") {
    const value = error as { code?: unknown; statusCode?: unknown; status?: unknown; cause?: unknown };
    if (value.code === "MISSING_PROVIDER_KEY" || value.code === "MODEL_CONFIGURATION") return value.code;
    const status = Number(value.statusCode ?? value.status);
    if (status === 401 || status === 403) return "PROVIDER_AUTH";
    if (status === 402) return "PROVIDER_BALANCE";
    if (status === 404) return "MODEL_UNAVAILABLE";
    if (status === 429) return "PROVIDER_RATE_LIMIT";
  }
  return "GENERATOR_UNAVAILABLE";
}
