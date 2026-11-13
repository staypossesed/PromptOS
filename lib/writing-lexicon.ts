import type { AppLanguage } from "@/types/language";

export const WRITING_DICTIONARY_VERSION = "2026-11-06-1";
export const foldWritingWord = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/’/gu, "'");
type Entry = { key: string; text: string; rank: number };
export interface WritingDictionaryData { version: string; language: AppLanguage; words: string[] }

// Frequency order is retained for ranking; the sorted index avoids scanning the
// whole vocabulary on every keystroke. No input is sent to fetch this public data.
export class WritingLexicon {
  readonly entries: Entry[];
  private readonly exact: Set<string>;
  constructor(readonly language: AppLanguage, words: readonly string[]) {
    const unique = new Map<string, Entry>();
    words.forEach((word, rank) => {
      const key = foldWritingWord(word);
      if (word.length >= 2 && word.length <= 40 && /^\p{L}[\p{L}\p{M}'’-]*$/u.test(word) && !unique.has(key)) unique.set(key, { key, text: word, rank });
    });
    this.entries = [...unique.values()].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    this.exact = new Set(unique.keys());
  }
  has(word: string) { return this.exact.has(foldWritingWord(word)); }
  complete(fragment: string): string {
    const key = foldWritingWord(fragment);
    if (!key || key.length > 40) return "";
    let lo = 0, hi = this.entries.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.entries[mid].key < key) lo = mid + 1; else hi = mid; }
    let best: Entry | undefined;
    for (let i = lo; i < this.entries.length && this.entries[i].key.startsWith(key); i++) {
      const entry = this.entries[i];
      if (entry.key.length > key.length && (!best || entry.rank < best.rank)) best = entry;
    }
    if (!best) return "";
    let offset = 0;
    while (offset < best.text.length && foldWritingWord(best.text.slice(0, offset)).length < key.length) offset++;
    let suffix = best.text.slice(offset);
    if (fragment.length > 1 && fragment === fragment.toUpperCase()) suffix = suffix.toUpperCase();
    return suffix;
  }
}

export function parseWritingDictionary(value: unknown, language: AppLanguage): WritingLexicon {
  const data = value as Partial<WritingDictionaryData> | null;
  if (!data || data.version !== WRITING_DICTIONARY_VERSION || data.language !== language || !Array.isArray(data.words) || data.words.length < 10000 || data.words.length > 60000 || data.words.some(word => typeof word !== "string" || word.length > 40)) throw new Error("Invalid writing dictionary");
  return new WritingLexicon(language, data.words);
}

const loaded = new Map<AppLanguage, WritingLexicon>();
const pending = new Map<AppLanguage, Promise<WritingLexicon>>();
export function loadWritingDictionary(language: AppLanguage): Promise<WritingLexicon> {
  const cached = loaded.get(language);
  if (cached) return Promise.resolve(cached);
  const inflight = pending.get(language);
  if (inflight) return inflight;
  const request = fetch(`/writing-dictionaries/${language}-${WRITING_DICTIONARY_VERSION}.json`, { credentials: "omit", cache: "force-cache" })
    .then(async response => {
      if (!response.ok) throw new Error("Writing dictionary unavailable");
      const lexicon = parseWritingDictionary(await response.json(), language);
      loaded.set(language, lexicon); return lexicon;
    }).finally(() => pending.delete(language));
  pending.set(language, request); return request;
}
