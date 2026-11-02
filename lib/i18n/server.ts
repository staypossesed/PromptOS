/**
 * Server-side i18n helpers.
 * Import ONLY in Server Components or Route Handlers.
 */

import { cookies, headers } from "next/headers";
import { requestLanguage } from "./request-language";
import { isSupportedLanguage, type AppLanguage } from "@/types/language";
import { LANGUAGE_COOKIE_KEY, DEFAULT_LANGUAGE } from "./config";
import { getDictionary } from "./dictionaries";
import type { Dictionary } from "./dictionaries";

export async function getServerLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  return requestLanguage(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value, (await headers()).get("accept-language") ?? "");
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
