"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-provider";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/config";
import type { AppLanguage } from "@/types/language";

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
};

interface LanguageSelectorProps {
  // When true, renders inline without a card wrapper (for use inside an existing Section)
  embedded?: boolean;
}

export function LanguageSelector({ embedded = false }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  const inner = (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">{t("settings.languageDescription")}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`text-sm font-medium rounded-full px-4 py-1.5 border transition-all ${
              language === lang
                ? "bg-ink-900 text-cream-50 border-ink-900"
                : "bg-white text-ink-600 border-ink-200 hover:border-ink-300 hover:text-ink-800"
            }`}
          >
            {LANGUAGE_NAMES[lang]}
          </button>
        ))}
      </div>
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="rounded-2xl border border-ink-100/70 bg-card card-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="size-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-[0.1em]">
          {t("settings.languageSection")}
        </h2>
      </div>
      {inner}
    </div>
  );
}
