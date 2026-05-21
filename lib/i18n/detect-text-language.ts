import type { AppLanguage } from "@/types/language";

// Cyrillic Unicode block
const CYRILLIC_RE = /[Ѐ-ӿ]/;

// Spanish-specific markers: inverted punctuation, tilde-n, accented vowels, common words
const SPANISH_CHARS_RE = /[¿¡ñÑáéíóúÁÉÍÓÚüÜ]/;
const SPANISH_WORDS_RE = /\b(quiero|necesito|crear|hacer|para\s|con\s|una?\s|el\s|los\s|las\s|del\s|que\s|como\s|es\s|son\s|por\s|sobre\s|desde\s|hasta\s|cuando\s|donde\s|quien|cómo|qué|cuál|escribir|generar|diseñar|construir|analizar|desarrollar)/i;

/**
 * Heuristic language detection for user input text.
 * Does NOT call any external API — pure local analysis.
 *
 * Priority:
 *  1. Cyrillic → ru
 *  2. Spanish markers → es
 *  3. Fallback → en (or appLanguage if provided)
 */
export function detectTextLanguage(
  text: string,
  appLanguage: AppLanguage = "en"
): AppLanguage {
  if (!text || text.trim().length < 3) return appLanguage;

  if (CYRILLIC_RE.test(text)) return "ru";

  if (SPANISH_CHARS_RE.test(text) || SPANISH_WORDS_RE.test(text)) return "es";

  return appLanguage === "ru" || appLanguage === "es" ? appLanguage : "en";
}
