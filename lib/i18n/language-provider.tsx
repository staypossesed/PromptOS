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

export function LanguageProvider({ children, initialLanguage = DEFAULT_LANGUAGE }: { children: React.ReactNode; initialLanguage?: AppLanguage }) {
  // Default to English during SSR to match server HTML and avoid hydration mismatch.
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);

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
    // No saved value: use the language already negotiated by the server.
    // The server already negotiated Accept-Language (or a saved cookie).
    // Resolve immediately: a delayed account lookup must not overwrite a switch.
    setLanguageState(initialLanguage);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage); } catch {}
    persistLanguageCookie(initialLanguage);
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
