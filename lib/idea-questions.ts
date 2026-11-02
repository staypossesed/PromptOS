import type { BeginnerQuestion } from "@/lib/beginner-copy";

// Store the actual question with its answer so later AI calls and saved tasks never
// reinterpret an answer under a different question, even after a page reload.
export const DETAIL_PREFIX = "detail:";
export function isDetailKey(key: string): boolean {
  return key.startsWith(DETAIL_PREFIX) && key.length > DETAIL_PREFIX.length && key.length <= 187 && !/[\r\n\u0000-\u001f]/u.test(key);
}
export function answeredQuestions(answers: Record<string, string>): BeginnerQuestion[] {
  return Object.entries(answers).filter(([key, value]) => isDetailKey(key) && value.trim()).slice(0, 2)
    .map(([id, value]) => ({ id, label: id.slice(DETAIL_PREFIX.length), options: [value] }));
}
export function parseIdeaQuestions(value: unknown): BeginnerQuestion[] | null {
  if (!Array.isArray(value) || value.length > 2) return null;
  const questions: BeginnerQuestion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.question !== "string" || !item.question.trim() || item.question.length > 180 || !Array.isArray(item.options) || item.options.length < 2 || item.options.length > 3) return null;
    if (item.options.some((option: unknown) => typeof option !== "string" || !option.trim() || option.length > 80)) return null;
    const id = DETAIL_PREFIX + item.question.trim();
    if (!isDetailKey(id) || questions.some(question => question.id === id)) return null;
    questions.push({ id, label: item.question.trim(), options: [...new Set<string>(item.options.map((option: string) => option.trim()))] });
    if (questions.at(-1)!.options.length < 2) return null;
  }
  return questions;
}
export const clarificationCopy = {
  en: { loading: "Finding the useful questions for your idea…", skip: "Continue without questions", failed: "We couldn’t prepare tailored questions. You can add details below or continue without them.", retry: "Try questions again", notice: "When you continue or choose an example, your idea is sent to Umprompt’s AI provider to prepare relevant questions." },
  ru: { loading: "Подбираем вопросы по вашей задаче…", skip: "Продолжить без вопросов", failed: "Не удалось подготовить вопросы по вашей задаче. Добавьте детали ниже или продолжите без вопросов.", retry: "Попробовать ещё раз", notice: "Когда вы продолжаете или выбираете пример, ваша идея отправляется ИИ-провайдеру Umprompt, чтобы подобрать вопросы по задаче." },
  es: { loading: "Buscando las preguntas útiles para tu idea…", skip: "Continuar sin preguntas", failed: "No pudimos preparar preguntas para tu tarea. Puedes añadir detalles abajo o continuar sin ellas.", retry: "Volver a intentarlo", notice: "Al continuar o elegir un ejemplo, tu idea se envía al proveedor de IA de Umprompt para preparar preguntas relevantes." }
};

export function parseQuestionSnapshot(value: unknown): BeginnerQuestion[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = parseIdeaQuestions(value.map(item => ({ question: item?.label, options: item?.options })));
  return parsed && parsed.every((question, index) => value[index]?.id === question.id) ? parsed : null;
}
