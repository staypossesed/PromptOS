export type GeneratorModel = "venice" | "configured";
export type GeneratorFormat = "general" | "image" | "writing" | "coding";
export interface GeneratorInput {
  action: "generate" | "check";
  model: GeneratorModel;
  idea: string;
  constraints: string;
  format: GeneratorFormat;
  language: "en" | "ru" | "es";
  negativePrompt: boolean;
}
export function parseGeneratorInput(body: unknown): GeneratorInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (b.action !== "generate" && b.action !== "check") return null;
  if (b.model !== "venice" && b.model !== "configured") return null;
  if (b.action === "check") return { action: "check", model: b.model, idea: "", constraints: "", format: "general", language: "en", negativePrompt: false };
  if (typeof b.idea !== "string" || b.idea.trim().length < 3 || b.idea.length > 6000) return null;
  if (b.constraints !== undefined && (typeof b.constraints !== "string" || b.constraints.length > 2000)) return null;
  if (b.format !== "general" && b.format !== "image" && b.format !== "writing" && b.format !== "coding") return null;
  if (b.language !== "en" && b.language !== "ru" && b.language !== "es") return null;
  if (b.negativePrompt !== undefined && typeof b.negativePrompt !== "boolean") return null;
  return { action: "generate", model: b.model, idea: b.idea.trim(), constraints: typeof b.constraints === "string" ? b.constraints.trim() : "", format: b.format, language: b.language, negativePrompt: b.format === "image" && b.negativePrompt === true };
}
