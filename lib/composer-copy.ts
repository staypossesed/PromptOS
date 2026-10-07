import type { AppLanguage } from "@/types/language";

const en = {
  title: "What do you have in mind?", subtitle: "A rough thought is a good place to start.",
  idea: "Your idea", placeholder: "Write, build, plan, figure something out...", create: "Make my prompt", generating: "Making your prompt...",
  checking: "Finding the details that matter...", inspiration: "Something to spark an idea", matching: "Ideas for what you have in mind",
  refresh: "Fresh ideas", details: "A little more detail", skip: "Use what I have", continue: "Make my prompt", custom: "Your own answer",
  audience: "Who is this for?", constraints: "Anything to include or avoid?", format: "What should the result look like?",
  context: "Extra details", result: "Your prompt", portable: "Ready for your AI", quality: "Quality check", qualityNote: "An estimate of prompt quality, not a guarantee of the answer.",
  save: "Save", saved: "Saved", copied: "Copied", copy: "Copy prompt", answer: "Was the AI's answer better?", yes: "Yes", no: "No", thanks: "Thanks for the feedback.",
  clarifyError: "Couldn't check for missing details. You can still make your prompt.", generateError: "Couldn't make your prompt. Please try again.",
  categories: { auto: "Anything", writing: "Writing", coding: "Coding", research: "Research", daily: "Everyday", business: "Business", creative: "Creative" },
};
type Copy = typeof en;
const es: Copy = {
  title: "¿Qué tienes en mente?", subtitle: "Una idea en bruto es un buen comienzo.", idea: "Tu idea", placeholder: "Escribir, crear, planear, entender algo...", create: "Crear mi prompt", generating: "Creando tu prompt...",
  checking: "Buscando los detalles importantes...", inspiration: "Ideas para inspirarte", matching: "Ideas relacionadas", refresh: "Nuevas ideas", details: "Un poco más de detalle", skip: "Usar lo que tengo", continue: "Crear mi prompt", custom: "Tu propia respuesta",
  audience: "¿Para quién es?", constraints: "¿Qué incluir o evitar?", format: "¿Cómo debe ser el resultado?", context: "Detalles adicionales", result: "Tu prompt", portable: "Listo para tu IA", quality: "Revisión de calidad", qualityNote: "Una estimación de la calidad del prompt, no una garantía del resultado.",
  save: "Guardar", saved: "Guardado", copied: "Copiado", copy: "Copiar prompt", answer: "¿La respuesta de la IA fue mejor?", yes: "Sí", no: "No", thanks: "Gracias por tu opinión.", clarifyError: "No pudimos comprobar los detalles. Puedes crear tu prompt igualmente.", generateError: "No se pudo crear tu prompt. Inténtalo de nuevo.",
  categories: { auto: "Cualquier cosa", writing: "Escritura", coding: "Código", research: "Investigación", daily: "Vida diaria", business: "Negocios", creative: "Creatividad" },
};
const ru: Copy = {
  title: "Что у вас на уме?", subtitle: "Даже черновая мысль — хорошее начало.", idea: "Ваша идея", placeholder: "Написать, создать, спланировать, разобраться...", create: "Создать промпт", generating: "Создаём промпт...",
  checking: "Находим важные детали...", inspiration: "Идеи для вдохновения", matching: "Идеи по вашей теме", refresh: "Новые идеи", details: "Немного больше деталей", skip: "Использовать то, что есть", continue: "Создать промпт", custom: "Свой ответ",
  audience: "Для кого это?", constraints: "Что включить или исключить?", format: "Каким должен быть результат?", context: "Дополнительные детали", result: "Ваш промпт", portable: "Готов для вашего ИИ", quality: "Проверка качества", qualityNote: "Оценка качества промпта, а не гарантия ответа.",
  save: "Сохранить", saved: "Сохранено", copied: "Скопировано", copy: "Копировать промпт", answer: "Ответ ИИ стал лучше?", yes: "Да", no: "Нет", thanks: "Спасибо за отзыв.", clarifyError: "Не удалось проверить детали. Вы всё равно можете создать промпт.", generateError: "Не удалось создать промпт. Попробуйте ещё раз.",
  categories: { auto: "Любая задача", writing: "Тексты", coding: "Код", research: "Исследования", daily: "На каждый день", business: "Бизнес", creative: "Творчество" },
};
export function composerCopy(language: AppLanguage): Copy { return ({ en, es, ru })[language] ?? en; }
