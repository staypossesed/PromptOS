export type AppLanguage = "en" | "ru" | "es";

export const SUPPORTED_LANGUAGES: AppLanguage[] = ["en", "ru", "es"];

export const languageLabels: Record<AppLanguage, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
};

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

/** Normalise a locale string like "ru-RU", "en-US", "es-MX" → "ru" | "en" | "es" | null */
export function normalizeLanguage(value: unknown): AppLanguage | null {
  if (typeof value !== "string") return null;
  const base = value.split(/[-_]/)[0].toLowerCase();
  if (isSupportedLanguage(base)) return base;
  return null;
}
