/**
 * Server-side i18n helpers.
 * Import ONLY in Server Components or Route Handlers.
 */

import { cookies } from "next/headers";
import { isSupportedLanguage, type AppLanguage } from "@/types/language";
import { LANGUAGE_COOKIE_KEY, DEFAULT_LANGUAGE } from "./config";
import { getDictionary } from "./dictionaries";
import type { Dictionary } from "./dictionaries";

export async function getServerLanguage(): Promise<AppLanguage> {
  try {
    const cookieStore = await cookies();
    const saved = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
    if (saved && isSupportedLanguage(saved)) return saved;
  } catch {}
  return DEFAULT_LANGUAGE;
}

export async function getServerTranslations(): Promise<{
  dict: Dictionary;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: AppLanguage;
}> {
  const language = await getServerLanguage();
  const dict = getDictionary(language);

  function t(key: string, vars?: Record<string, string | number>): string {
    const parts = key.split(".");
    let result: unknown = dict;
    for (const part of parts) {
      if (typeof result !== "object" || result === null) return key;
      result = (result as Record<string, unknown>)[part];
    }
    if (typeof result !== "string") return key;
    if (!vars) return result;
    return result.replace(/\{(\w+)\}/g, (_, k) =>
      vars[k] !== undefined ? String(vars[k]) : `{${k}}`
    );
  }

  return { dict, t, language };
}
