"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AppLanguage } from "@/types/language";
import { isSupportedLanguage } from "@/types/language";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_MANUAL_KEY,
  LANGUAGE_COOKIE_KEY,
} from "./config";
import { getDictionary } from "./dictionaries";
import type { Dictionary } from "./dictionaries";
import { detectPreferredLanguage } from "./detect-language";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ---------------------------------------------------------------------------
// Dev logging helper
// ---------------------------------------------------------------------------

function devLog(msg: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[i18n] ${msg}`, data);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to English during SSR to match server HTML and avoid hydration mismatch.
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // ── Step 1: Read localStorage synchronously ────────────────────────────
    let saved: string | null = null;
    let isManual = false;
    try {
      saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      isManual = localStorage.getItem(LANGUAGE_MANUAL_KEY) === "1";
    } catch { /* localStorage blocked (private browsing, etc.) */ }

    // ── Step 2: Manual choice always wins — no async needed ────────────────
    if (isManual && saved && isSupportedLanguage(saved)) {
      setLanguageState(saved);
      persistLanguageCookie(saved);
      devLog("language resolved", { language: saved, source: "manual" });
      return;
    }

    // ── Step 3: Previously auto-detected value in localStorage ─────────────
    // Covers returning visitors whose language was cached from a prior session.
    if (saved && isSupportedLanguage(saved)) {
      setLanguageState(saved);
      persistLanguageCookie(saved);
      devLog("language resolved", { language: saved, source: "localStorage" });
      return;
    }

    // ── Step 4: First visit — run full detection cascade ───────────────────
    // No localStorage value → fetch metadata + read browser/timezone.
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? null;

      const browserLanguages: string[] =
        typeof navigator !== "undefined"
          ? Array.from(navigator.languages ?? [navigator.language])
          : [];

      let timezone: string | undefined;
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch { /* not available */ }

      const { language: detected, source } = detectPreferredLanguage({
        userMetadata: meta,
        browserLanguages,
        timezone,
      });

      setLanguageState(detected);

      // Cache the detected language so subsequent page loads skip re-detection.
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
      } catch { /* storage blocked */ }

      persistLanguageCookie(detected);

      devLog("language detected", { language: detected, source, browserLanguages, timezone });

      // Only track when there was an actual signal (not just the English default)
      if (source !== "default" || detected !== DEFAULT_LANGUAGE) {
        track("language_detected", { language: detected as string, source } as never);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();

  // ── Manual language change (called from LanguageSelector) ─────────────────
  const setLanguage = useCallback((lang: AppLanguage) => {
    if (!isSupportedLanguage(lang)) return;
    setLanguageState(lang);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Mark as manually chosen — this flag makes it survive any future re-detection.
      localStorage.setItem(LANGUAGE_MANUAL_KEY, "1");
    } catch { /* storage blocked */ }

    persistLanguageCookie(lang);
    track("language_changed", { language: lang as string } as never);
    devLog("language changed (manual)", { language: lang, source: "manual" });

    // Re-render server components so server-translated pages (settings, dashboard,
    // history, templates) pick up the new cookie immediately without a hard reload.
    router.refresh();
  }, [router]);

  const dict = getDictionary(language);

  // Dot-path t() with optional {var} interpolation
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

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

function persistLanguageCookie(lang: AppLanguage) {
  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch { /* not in browser */ }
}
