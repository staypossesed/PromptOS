import { rememberVersion, type PromptVersion } from "./workspace";

export const MAX_PROMPT_LENGTH = 16000;

export function canExpandIdea(idea: string): boolean {
  return (idea.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2;
}

export function editPromptText(original: string, value: string, versions: PromptVersion[] | undefined, checkpoint: boolean) {
  const prompt = value.slice(0, MAX_PROMPT_LENGTH);
  const changed = prompt !== original;
  return { prompt, changed, versions: changed && checkpoint ? rememberVersion(versions, original, "Manual edit") : versions ?? [] };
}
