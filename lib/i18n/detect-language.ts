import { isSupportedLanguage, normalizeLanguage, type AppLanguage } from "@/types/language";
import { DEFAULT_LANGUAGE } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetectOptions {
  /** Supabase user_metadata object */
  userMetadata?: Record<string, unknown> | null;
  /** navigator.languages or [navigator.language] */
  browserLanguages?: readonly string[];
  /** Intl.DateTimeFormat().resolvedOptions().timeZone */
  timezone?: string;
}

export type DetectSource =
  | "manual"       // user explicitly chose in Settings
  | "localStorage" // saved from a previous session
  | "metadata"     // OAuth identity_data locale field
  | "browser"      // navigator.languages
  | "timezone"     // Intl timezone fallback (weak)
  | "default";     // nothing matched — English

export interface DetectResult {
  language: AppLanguage;
  source: DetectSource;
}

// ---------------------------------------------------------------------------
// Timezone map (only used as a last resort before defaulting)
// Only specific, unambiguous timezones are mapped.
// America/* timezones that are Spanish-speaking countries are included;
// generic US timezones (America/New_York, America/Phoenix, etc.) are NOT.
// ---------------------------------------------------------------------------

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
  // Spanish-speaking countries (LatAm + Spain)
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fromMetadata(meta: Record<string, unknown> | null | undefined): AppLanguage | null {
  if (!meta) return null;

  // Only read explicit language preference fields — do NOT read email, name, or domain
  for (const field of ["preferred_language", "language", "locale"]) {
    const v = meta[field];
    if (typeof v === "string") {
      const lang = normalizeLanguage(v);
      if (lang) return lang;
    }
  }

  // Check OAuth identity_data inside identities array (e.g. Google/GitHub locale)
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

/** Returns the first supported language from the browser's preference list. */
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

// ---------------------------------------------------------------------------
// Main detection function
//
// Priority (called ONLY when no localStorage/manual value exists):
//   1. OAuth metadata locale
//   2. Browser language (navigator.languages)
//   3. Timezone (weak fallback)
//   4. Default English
//
// The provider handles localStorage and manual checks BEFORE calling this.
// ---------------------------------------------------------------------------

export function detectPreferredLanguage(opts: DetectOptions): DetectResult {
  // 1. OAuth / profile metadata
  const metaLang = fromMetadata(opts.userMetadata as Record<string, unknown> | null);
  if (metaLang) return { language: metaLang, source: "metadata" };

  // 2. Browser language preference
  if (opts.browserLanguages && opts.browserLanguages.length > 0) {
    const lang = fromBrowser(opts.browserLanguages);
    if (lang) return { language: lang, source: "browser" };
  }

  // 3. Timezone (last resort — only fires when no metadata and no browser match)
  const tzLang = fromTimezone(opts.timezone);
  if (tzLang) return { language: tzLang, source: "timezone" };

  return { language: DEFAULT_LANGUAGE, source: "default" };
}
