import type { AppLanguage } from "@/types/language";
import { isStudyTask } from "@/lib/task-intent";

export const assistantLinks = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "Claude", url: "https://claude.ai/new" },
] as const;

const copy = {
  en: { open: "Open in", here: "Get the result right here", hereHelp: "Uses one generation. Your instructions stay here if it fails.", improving: "Checking and improving…", estimate: "Usually about 20 seconds; it may take longer. You can still copy your instructions.", cancel: "Cancel", languageError: "The result was in the wrong language. Your previous work is unchanged. Please try again.", handoff: ["Copy your instructions.", "Open an assistant below, paste your instructions, and send.", "Read and check the result before using it."], study: "For this study task, start with the assistant’s first lesson." },
  ru: { open: "Открыть в", here: "Получить результат прямо здесь", hereHelp: "Использует одну генерацию. При ошибке инструкции останутся на месте.", improving: "Проверяем и улучшаем…", estimate: "Обычно около 20 секунд, иногда дольше. Инструкции по-прежнему можно скопировать.", cancel: "Отмена", languageError: "Результат оказался на другом языке. Предыдущая работа сохранена. Попробуйте ещё раз.", handoff: ["Скопируйте инструкции.", "Откройте помощника ниже, вставьте инструкции и отправьте.", "Прочитайте и проверьте результат перед использованием."], study: "Для этой учебной задачи начните с первого занятия помощника." },
  es: { open: "Abrir en", here: "Obtener el resultado aquí", hereHelp: "Usa una generación. Si falla, tus instrucciones seguirán aquí.", improving: "Revisando y mejorando…", estimate: "Normalmente unos 20 segundos; puede tardar más. Puedes seguir copiando tus instrucciones.", cancel: "Cancelar", languageError: "El resultado estaba en otro idioma. Tu trabajo anterior sigue intacto. Inténtalo de nuevo.", handoff: ["Copia tus instrucciones.", "Abre un asistente abajo, pega tus instrucciones y envíalas.", "Lee y revisa el resultado antes de usarlo."], study: "Para esta tarea de estudio, empieza con la primera lección del asistente." },
};
export function beginnerFeedback(language: AppLanguage) { return copy[language]; }
export function handoffSteps(idea: string, language: AppLanguage): string[] {
  const c = copy[language];
  return isStudyTask(idea) ? [...c.handoff, c.study] : c.handoff;
}
