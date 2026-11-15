import { normalizeLanguage, type AppLanguage } from "@/types/language";

/** Names and isolated accented letters are not evidence of an output language. */
export function detectedOutputLanguage(text: string): AppLanguage | null {
  const prose = text.replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ");
  const words = prose.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];
  const markers = {
    en: new Set(["the", "and", "your", "you", "write", "please", "message", "with", "for", "that", "this", "thank", "would", "could"]),
    es: new Set(["el", "la", "los", "las", "una", "para", "que", "con", "escribe", "mensaje", "breve", "gracias", "por", "quiero", "solicita"]),
    ru: new Set(["и", "в", "на", "для", "вы", "напиши", "сообщение", "пожалуйста", "это", "что", "как", "мне"]),
  };
  const counts = (["en", "es", "ru"] as const).map(language => ({
    language, count: words.filter(word => markers[language].has(word)).length,
  })).sort((a, b) => b.count - a.count);
  const [best, second] = counts;
  if (best.count >= 3 && best.count >= second.count * 2) return best.language;
  const cyrillic = (prose.match(/[А-Яа-яЁё]/g) ?? []).length;
  if (cyrillic >= 12 && cyrillic > (prose.match(/[a-z]/gi) ?? []).length) return "ru";
  return null; // Short, technical or mixed text is inconclusive.
}

export function outputMatchesLanguage(text: string, language: string): boolean {
  const detected = detectedOutputLanguage(text);
  return !detected || detected === (normalizeLanguage(language) ?? "en");
}

export function outputLanguageInstruction(language?: string): string {
  const code = normalizeLanguage(language) ?? "en";
  const name = { en: "English", es: "Spanish", ru: "Russian" }[code];
  return `Required output language: ${name} (${code}). This explicit selection takes precedence over the language of the idea, examples, existing output, names and places. Write the entire response in ${name}, and, when producing instructions for another assistant, specify that it should respond in ${name}. Preserve proper names such as José and Zoë, code identifiers and quoted source text. Before returning, check that the prose is in ${name}; correct it if it is not.`;
}

