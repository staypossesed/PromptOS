"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { AppLanguage } from "@/types/language";
import { isSupportedLanguage } from "@/types/language";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, LANGUAGE_COOKIE_KEY } from "./config";
import { getDictionary } from "./dictionaries";
import type { Dictionary } from "./dictionaries";
import { detectPreferredLanguage } from "./detect-language";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to English during SSR to avoid hydration mismatch.
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Detect language only after mount (client-only)
    let savedLanguage: string | null = null;
    try {
      savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {}

    // Try to get Supabase user metadata for OAuth locale
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? null;
      const browserLanguages =
        typeof navigator !== "undefined"
          ? navigator.languages ?? [navigator.language]
          : [];
      let timezone: string | undefined;
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {}

      const { language: detected, source } = detectPreferredLanguage({
        savedLanguage,
        userMetadata: meta,
        browserLanguages,
        timezone,
      });

      setLanguageState(detected);
      setMounted(true);

      // Track on first detection (not when it's just "default" with no real signal)
      if (source !== "default" || detected !== DEFAULT_LANGUAGE) {
        track("language_detected", {
          language: detected as string,
          source,
        } as never);
      }

      // Persist cookie for server components
      persistLanguageCookie(detected);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback((lang: AppLanguage) => {
    if (!isSupportedLanguage(lang)) return;
    setLanguageState(lang);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {}

    persistLanguageCookie(lang);

    track("language_changed", { language: lang as string } as never);
  }, []);

  const dict = getDictionary(language);

  // Dot-path t() function with optional {var} interpolation
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
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
    },
    [dict]
  );

  // During SSR and before mount, render with English dict to match server HTML.
  // After mount we switch to detected language. Use suppressHydrationWarning on
  // the <html> element (already set in layout.tsx) to avoid React warnings on
  // the lang attribute change.
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

function persistLanguageCookie(lang: AppLanguage) {
  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}
