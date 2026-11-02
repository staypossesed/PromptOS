import type { PromptSummary } from "@/types/prompt";

export type SavedDelivery = "prompt" | "answer";

// Older records contain reusable prompts but have no delivery field.
export function savedDelivery(item: Pick<PromptSummary, "delivery">): SavedDelivery {
  return item.delivery === "answer" ? "answer" : "prompt";
}

export function deliveryFilter(value: unknown): SavedDelivery | "" {
  return value === "prompt" || value === "answer" ? value : "";
}

export function filterSavedPrompts(items: PromptSummary[], query: string, delivery: SavedDelivery | ""): PromptSummary[] {
  const search = query.trim().toLocaleLowerCase();
  return items.filter((item) =>
    (!delivery || savedDelivery(item) === delivery) &&
    (!search || [item.title, item.idea, item.generated_prompt].some((text) => text.toLocaleLowerCase().includes(search)))
  );
}
