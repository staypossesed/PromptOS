import { isSupportedLanguage, normalizeLanguage, type AppLanguage } from "@/types/language";

export function requestLanguage(saved: unknown, acceptLanguage = ""): AppLanguage {
  if (isSupportedLanguage(saved)) return saved;
  const preferences = acceptLanguage.split(",").map((item, order) => {
    const [tag, ...parameters] = item.trim().split(";");
    const parameter = parameters.find((value) => value.trim().startsWith("q="));
    const quality = parameter ? Number(parameter.trim().slice(2)) : 1;
    return { language: normalizeLanguage(tag.trim()), quality, order };
  }).filter((item) => item.language && Number.isFinite(item.quality) && item.quality > 0 && item.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.order - b.order);
  return preferences[0]?.language ?? "en";
}
