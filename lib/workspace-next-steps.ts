import type { AppLanguage } from "@/types/language";
import { isTaskCategory } from "@/lib/task-categories";
import { nextSteps } from "@/lib/workspace";
const es = {
  auto: ["Crear un plan de acción", "Revisar lo que falta", "Explicarlo de forma más sencilla"],
  writing: ["Crear una versión más breve", "Redactar un mensaje de seguimiento", "Revisar claridad y tono"],
  coding: ["Crear un plan de pruebas", "Revisar riesgos de seguridad", "Escribir la documentación"],
  research: ["Revisar fuentes y evidencia faltante", "Comparar alternativas", "Convertir los hallazgos en un plan"],
  daily: ["Crear una lista práctica", "Adaptarlo a un presupuesto menor", "Planear la próxima semana"],
  business: ["Redactar un mensaje para clientes", "Crear una lista de lanzamiento", "Planear un pequeño experimento"],
  creative: ["Explorar tres alternativas", "Crear una lista de producción", "Redactar un brief creativo"],
};
const ru = {
  auto: ["Составить план действий", "Проверить пробелы", "Объяснить проще"],
  writing: ["Создать короткую версию", "Написать следующее сообщение", "Проверить ясность и тон"],
  coding: ["Составить план тестирования", "Проверить риски безопасности", "Написать документацию"],
  research: ["Проверить источники и недостающие данные", "Сравнить альтернативы", "Превратить выводы в план"],
  daily: ["Составить практический список", "Адаптировать к меньшему бюджету", "Спланировать следующую неделю"],
  business: ["Написать сообщение клиентам", "Составить список для запуска", "Спланировать небольшой эксперимент"],
  creative: ["Исследовать три альтернативы", "Составить производственный список", "Написать творческое задание"],
};
export function localizedNextSteps(category: unknown, language: AppLanguage): string[] {
  const key = isTaskCategory(category) ? category : "auto";
  return language === "es" ? es[key] : language === "ru" ? ru[key] : nextSteps(key);
}
