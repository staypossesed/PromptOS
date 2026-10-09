import type { AppLanguage } from "@/types/language";

const en = {
  startTitle: "Simplify your work with AI chatbots", startSubtitle: "Less time finding the words. More time getting things done.",
  placeholderIdeas: ["Write a polite email asking for more time.", "Plan meals for the week on a small budget.", "Explain a complicated topic in simple words.", "Help me prepare for a job interview.", "Plan a weekend trip with my family.", "Turn my messy notes into a clear to-do list."],
  pauseExamples: "Pause examples", resumeExamples: "Resume examples",
  title: "A clear request for ChatGPT", subtitle: "Your idea, put into words. For ChatGPT and other AI chatbots.",
  idea: "What would you like help with?", placeholder: "For example: I need to write a polite email asking for more time.", create: "Prepare my request", guestCreate: "Sign in to prepare my request", generating: "Preparing your request...",
  category: "Task type (optional)",
  checking: "Checking the details...", inspiration: "Example tasks", matching: "Related tasks",
  refresh: "More examples", details: "A few details about your request", skip: "Use what I have", continue: "Prepare my request", custom: "Your own answer",
  audience: "Who is this for?", constraints: "Anything to include or avoid?", format: "What should the result look like?",
  context: "More details (optional)", result: "Your prepared request", portable: "For ChatGPT or another AI chatbot", quality: "Quality check", qualityNote: "An estimate of prompt quality, not a guarantee of the answer.",
  save: "Save", saved: "Saved", copied: "Copied", copy: "Copy request", answer: "Was the AI's answer better?", yes: "Yes", no: "No", thanks: "Thanks for the feedback.",
  clarifyError: "Couldn't check for missing details. You can still prepare your request.", generateError: "Couldn't prepare your request. Please try again.",
  categories: { auto: "Any task", writing: "Emails & writing", coding: "Apps & computer code", research: "Learning & comparing", daily: "Home & planning", business: "Work & business", creative: "Stories & ideas" },
};
type Copy = typeof en;
const es: Copy = {
  startTitle: "Simplifica tu trabajo con asistentes de IA", startSubtitle: "Menos tiempo buscando las palabras. Más tiempo haciendo las cosas.",
  placeholderIdeas: ["Escribir un correo amable para pedir más tiempo.", "Planear las comidas de la semana con poco presupuesto.", "Explicar un tema complicado con palabras sencillas.", "Prepararme para una entrevista de trabajo.", "Planear un viaje de fin de semana con mi familia.", "Convertir mis notas en una lista clara de tareas."],
  pauseExamples: "Pausar ejemplos", resumeExamples: "Reanudar ejemplos",
  title: "Una petición clara para ChatGPT", subtitle: "Tu idea, con las palabras adecuadas. Para ChatGPT y otros asistentes de IA.", idea: "¿Con qué te gustaría recibir ayuda?", placeholder: "Por ejemplo: necesito escribir un correo amable para pedir más tiempo.", create: "Preparar mi petición", guestCreate: "Iniciar sesión y preparar mi petición", generating: "Preparando tu petición...", category: "Tipo de tarea (opcional)",
  checking: "Comprobando los detalles...", inspiration: "Ejemplos de tareas", matching: "Tareas relacionadas", refresh: "Más ejemplos", details: "Algunos detalles de tu petición", skip: "Usar lo que tengo", continue: "Preparar mi petición", custom: "Tu propia respuesta",
  audience: "¿Para quién es?", constraints: "¿Qué incluir o evitar?", format: "¿Cómo debe ser el resultado?", context: "Más detalles (opcional)", result: "Tu petición preparada", portable: "Para ChatGPT u otro asistente de IA", quality: "Revisión de calidad", qualityNote: "Una estimación de la calidad del prompt, no una garantía del resultado.",
  save: "Guardar", saved: "Guardado", copied: "Copiado", copy: "Copiar petición", answer: "¿La respuesta de la IA fue mejor?", yes: "Sí", no: "No", thanks: "Gracias por tu opinión.", clarifyError: "No pudimos comprobar los detalles. Puedes preparar tu petición igualmente.", generateError: "No se pudo preparar tu petición. Inténtalo de nuevo.",
  categories: { auto: "Cualquier tarea", writing: "Correos y textos", coding: "Apps y programación", research: "Aprender y comparar", daily: "Hogar y planes", business: "Trabajo y negocios", creative: "Historias e ideas" },
};
const ru: Copy = {
  startTitle: "Упростите работу с ИИ-чатами", startSubtitle: "Меньше времени на поиск слов. Больше времени на дела.",
  placeholderIdeas: ["Написать вежливое письмо с просьбой дать больше времени.", "Составить недорогое меню на неделю.", "Объяснить сложную тему простыми словами.", "Подготовиться к собеседованию.", "Спланировать поездку на выходные с семьёй.", "Превратить заметки в понятный список дел."],
  pauseExamples: "Приостановить примеры", resumeExamples: "Продолжить примеры",
  title: "Понятный запрос для ChatGPT", subtitle: "Ваша идея, выраженная словами. Для ChatGPT и других ИИ-чатов.", idea: "С чем вам нужна помощь?", placeholder: "Например: нужно написать вежливое письмо с просьбой дать больше времени.", create: "Подготовить запрос", guestCreate: "Войти и подготовить запрос", generating: "Готовим запрос...", category: "Тип задачи (необязательно)",
  checking: "Проверяем детали...", inspiration: "Примеры задач", matching: "Похожие задачи", refresh: "Другие примеры", details: "Несколько деталей о запросе", skip: "Использовать то, что есть", continue: "Подготовить запрос", custom: "Свой ответ",
  audience: "Для кого это?", constraints: "Что включить или исключить?", format: "Каким должен быть результат?", context: "Больше деталей (необязательно)", result: "Ваш подготовленный запрос", portable: "Для ChatGPT или другого ИИ-чата", quality: "Проверка качества", qualityNote: "Оценка качества промпта, а не гарантия ответа.",
  save: "Сохранить", saved: "Сохранено", copied: "Скопировано", copy: "Копировать запрос", answer: "Ответ ИИ стал лучше?", yes: "Да", no: "Нет", thanks: "Спасибо за отзыв.", clarifyError: "Не удалось проверить детали. Вы всё равно можете подготовить запрос.", generateError: "Не удалось подготовить запрос. Попробуйте ещё раз.",
  categories: { auto: "Любая задача", writing: "Письма и тексты", coding: "Приложения и код", research: "Учёба и сравнение", daily: "Дом и планы", business: "Работа и бизнес", creative: "Истории и идеи" },
};
export function composerCopy(language: AppLanguage): Copy { return ({ en, es, ru })[language] ?? en; }
