import { parsePromptContext } from "@/lib/prompt-context";
import type { PromptContext } from "@/types/prompt";
export const CHECKOUT_DRAFT_KEY = "ump:checkout_draft";
export function clearCheckoutDraft() {
  try { sessionStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch {}
}
export interface CheckoutDraft { idea: string; context: PromptContext; prompt: string; tool: "claude" | "cursor" | "chatgpt"; savedId: string | null; copied: boolean; saved: boolean; createdAt: number }
export function parseCheckoutDraft(raw: string | null, now = Date.now()): CheckoutDraft | null {
  if (!raw || raw.length > 150000) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || typeof v.idea !== "string" || v.idea.length > 4000 || typeof v.prompt !== "string" || v.prompt.length > 16000 || !["claude", "cursor", "chatgpt"].includes(v.tool) || typeof v.createdAt !== "number" || v.createdAt > now || now - v.createdAt > 30 * 60 * 1000) return null;
    const context = parsePromptContext(v.context);
    if (!context.data) return null;
    return { idea: v.idea, prompt: v.prompt, tool: v.tool, context: context.data, savedId: typeof v.savedId === "string" && /^[0-9a-f-]{36}$/i.test(v.savedId) ? v.savedId : null, copied: v.copied === true, saved: v.saved === true, createdAt: v.createdAt };
  } catch { return null; }
}
