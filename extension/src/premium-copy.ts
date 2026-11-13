import type { AppLanguage } from "../../types/language";

const en = {
  companion: "Your browser companion", kicker: "A simpler way to use AI", hero: "Your idea.\nA clearer start.",
  intro: "A few words are enough. Turn what’s on your mind into a useful prompt for any AI assistant.",
  resultIntro: "Make it yours, copy it, and use it with your preferred AI assistant.",
  ideaStep: "01 · YOUR IDEA", resultStep: "02 · YOUR PROMPT", inputHelp: "No perfect wording needed.",
  suggestions: "A little inspiration", example: "See what you’ll get", exampleNote: "A sample, not your result",
  messages: "Writing", planning: "Planning", learning: "Learning", detailsHint: "Personalize your result",
  savedSpace: "Your saved ideas", historyIntro: "The good ones are worth keeping. Find a prompt and pick up where you left off.",
  emptyTitle: "A home for your good ideas", emptyNote: "Choose Save after creating a prompt. You’ll find it here, ready to use again.",
  create: "Start an idea", historyCount: "saved", guestHint: "Sign in to prepare your prompt. Your idea stays here.",
  account: "Your workspace", free: "Free", pro: "Pro", usage: "ideas left this week", sync: "Save what matters. Use it anywhere.",
  copyHint: "Paste it into your preferred AI assistant.", qualityHint: "Improve this prompt using the checks below.",
  privacyShort: "Your draft stays on this device until you choose to create or improve a prompt.",
  connectionHint: "One account for the website and this extension.", loading: "Getting your workspace ready…",
};
type PremiumCopy = typeof en;
const ru: PremiumCopy = {
  companion: "Помощник в браузере", kicker: "С ИИ — проще", hero: "Ваша идея.\nПонятный запрос.",
  intro: "Начните с пары слов. Мы поможем превратить вашу мысль в полезный запрос для любого ИИ-помощника.",
  resultIntro: "При желании отредактируйте, скопируйте и используйте в удобном вам ИИ-помощнике.",
  ideaStep: "01 · ВАША ИДЕЯ", resultStep: "02 · ВАШ ЗАПРОС", inputHelp: "Не нужно искать идеальные слова.",
  suggestions: "С чего можно начать", example: "Посмотреть пример", exampleNote: "Образец, а не ваш результат",
  messages: "Тексты", planning: "Планы", learning: "Учёба", detailsHint: "Сделайте результат точнее",
  savedSpace: "Ваши сохранённые идеи", historyIntro: "К хорошим идеям приятно возвращаться. Откройте запрос и продолжите с того места, где остановились.",
  emptyTitle: "Место для хороших идей", emptyNote: "Создайте запрос и нажмите «Сохранить». Он появится здесь — к нему всегда можно вернуться.",
  create: "Начать с идеи", historyCount: "сохранено", guestHint: "Войдите в аккаунт, чтобы создать запрос. Ваша идея останется здесь.",
  account: "Ваше пространство", free: "Бесплатный", pro: "Pro", usage: "идей осталось на неделю", sync: "Сохраняйте важное. Используйте где удобно.",
  copyHint: "Вставьте в удобный вам ИИ-помощник.", qualityHint: "Улучшите запрос по результатам проверки.",
  privacyShort: "Черновик остаётся на устройстве, пока вы не решите создать или улучшить запрос.",
  connectionHint: "Один аккаунт для сайта и расширения.", loading: "Готовим ваше пространство…",
};
const es: PremiumCopy = {
  companion: "Tu compañero en el navegador", kicker: "Una forma más fácil de usar la IA", hero: "Tu idea.\nUn comienzo claro.",
  intro: "Bastan unas palabras. Convierte lo que tienes en mente en un prompt útil para tu asistente de IA.",
  resultIntro: "Hazlo tuyo, cópialo y úsalo con tu asistente de IA preferido.",
  ideaStep: "01 · TU IDEA", resultStep: "02 · TU PROMPT", inputHelp: "No necesitas las palabras perfectas.",
  suggestions: "Un poco de inspiración", example: "Mira un ejemplo", exampleNote: "Una muestra, no tu resultado",
  messages: "Textos", planning: "Planes", learning: "Estudio", detailsHint: "Personaliza el resultado",
  savedSpace: "Tus ideas guardadas", historyIntro: "Las buenas ideas merecen conservarse. Abre un prompt y retoma donde lo dejaste.",
  emptyTitle: "Un lugar para tus buenas ideas", emptyNote: "Elige Guardar después de crear un prompt. Lo encontrarás aquí, listo para volver a usarlo.",
  create: "Empezar con una idea", historyCount: "guardados", guestHint: "Inicia sesión para preparar el prompt. Tu idea seguirá aquí.",
  account: "Tu espacio", free: "Gratis", pro: "Pro", usage: "ideas disponibles esta semana", sync: "Guarda lo importante. Úsalo donde quieras.",
  copyHint: "Pégalo en tu asistente de IA preferido.", qualityHint: "Mejora el prompt con los criterios de abajo.",
  privacyShort: "El borrador se queda en tu dispositivo hasta que decidas crear o mejorar un prompt.",
  connectionHint: "Una cuenta para el sitio y la extensión.", loading: "Preparando tu espacio…",
};
export const premiumCopy = (language: AppLanguage): PremiumCopy => ({ en, ru, es })[language];
