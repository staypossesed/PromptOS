import type { AppLanguage } from "@/types/language";
import { en } from "./en";
import { ru } from "./ru";
import { es } from "./es";

export type { Dictionary } from "./en";
export { en };

const dictionaries = { en, ru, es } as const;

export function getDictionary(lang: AppLanguage | string) {
  if (lang in dictionaries) return dictionaries[lang as AppLanguage];
  return en;
}
