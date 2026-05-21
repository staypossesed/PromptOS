import { isSupportedLanguage, normalizeLanguage, type AppLanguage } from "@/types/language";
import { DEFAULT_LANGUAGE } from "./config";

interface DetectOptions {
  /** Value saved in localStorage / user prefs */
  savedLanguage?: string | null;
  /** Supabase user_metadata object */
  userMetadata?: Record<string, unknown> | null;
  /** navigator.languages or navigator.language */
  browserLanguages?: readonly string[];
  /** Intl.DateTimeFormat().resolvedOptions().timeZone */
  timezone?: string;
}

const TIMEZONE_MAP: Record<string, AppLanguage> = {
  // Russia
  "Europe/Moscow": "ru",
  "Europe/Kaliningrad": "ru",
  "Europe/Samara": "ru",
  "Asia/Yekaterinburg": "ru",
  "Asia/Omsk": "ru",
  "Asia/Krasnoyarsk": "ru",
  "Asia/Irkutsk": "ru",
  "Asia/Yakutsk": "ru",
  "Asia/Vladivostok": "ru",
  "Asia/Magadan": "ru",
  "Asia/Kamchatka": "ru",
  // Spanish-speaking countries
  "America/Mexico_City": "es",
  "America/Bogota": "es",
  "America/Lima": "es",
  "America/Santiago": "es",
  "America/Buenos_Aires": "es",
  "America/Argentina/Buenos_Aires": "es",
  "America/Caracas": "es",
  "America/La_Paz": "es",
  "America/Guayaquil": "es",
  "America/Asuncion": "es",
  "America/Montevideo": "es",
  "America/Havana": "es",
  "Europe/Madrid": "es",
};

function fromMetadata(meta: Record<string, unknown> | null | undefined): AppLanguage | null {
  if (!meta) return null;

  // Check common metadata fields
  for (const field of ["preferred_language", "language", "locale"]) {
    const v = meta[field];
    if (typeof v === "string") {
      const lang = normalizeLanguage(v);
      if (lang) return lang;
    }
  }

  // Check OAuth identity_data inside identities array
  const identities = meta["identities"];
  if (Array.isArray(identities)) {
    for (const identity of identities) {
      if (identity && typeof identity === "object") {
        const data = (identity as Record<string, unknown>)["identity_data"];
        if (data && typeof data === "object") {
          for (const field of ["locale", "language"]) {
            const v = (data as Record<string, unknown>)[field];
            if (typeof v === "string") {
              const lang = normalizeLanguage(v);
              if (lang) return lang;
            }
          }
        }
      }
    }
  }

  return null;
}

function fromBrowser(langs: readonly string[]): AppLanguage | null {
  for (const l of langs) {
    const lang = normalizeLanguage(l);
    if (lang) return lang;
  }
  return null;
}

function fromTimezone(tz: string | undefined): AppLanguage | null {
  if (!tz) return null;
  return TIMEZONE_MAP[tz] ?? null;
}

export interface DetectResult {
  language: AppLanguage;
  source: "manual" | "saved" | "metadata" | "browser" | "timezone" | "default";
}

export function detectPreferredLanguage(opts: DetectOptions): DetectResult {
  // 1. Saved manual preference
  if (opts.savedLanguage && isSupportedLanguage(opts.savedLanguage)) {
    return { language: opts.savedLanguage, source: "saved" };
  }

  // 2. OAuth metadata
  const fromMeta = fromMetadata(opts.userMetadata as Record<string, unknown> | null);
  if (fromMeta) return { language: fromMeta, source: "metadata" };

  // 3. Browser language
  if (opts.browserLanguages && opts.browserLanguages.length > 0) {
    const lang = fromBrowser(opts.browserLanguages);
    if (lang) return { language: lang, source: "browser" };
  }

  // 4. Timezone fallback (weak signal)
  const tzLang = fromTimezone(opts.timezone);
  if (tzLang) return { language: tzLang, source: "timezone" };

  return { language: DEFAULT_LANGUAGE, source: "default" };
}
