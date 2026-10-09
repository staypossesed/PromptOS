import type { IdeaSuggestion } from "./idea-suggestions";

export const LOCALIZED_IDEAS: Record<"es" | "ru", IdeaSuggestion[]> = {
  es: [
    { id: "email", category: "writing", title: "Escribir un correo", idea: "Escribe un correo para pedir una prórroga, honesto y profesional sin explicar demasiado.", keywords: ["escribir", "correo", "mensaje", "responder"] },
    { id: "edit", category: "writing", title: "Mejorar un texto", idea: "Edita mi borrador para que sea claro y fluido sin cambiar mi voz ni el significado.", keywords: ["editar", "mejorar", "texto", "escribir"] },
    { id: "feature", category: "coding", title: "Planear una app o un sitio web", idea: "Convierte mi idea de una función en un plan que encaje con mi proyecto y tenga criterios de aceptación.", keywords: ["crear", "programar", "código", "app", "web"] },
    { id: "debug", category: "coding", title: "Corregir un error de programación", idea: "Ayúdame a encontrar la causa de un error, proponer un arreglo mínimo y comprobar que no haya regresiones.", keywords: ["arreglar", "error", "depurar", "código"] },
    { id: "compare", category: "research", title: "Comparar opciones antes de comprar", idea: "Compara mis opciones según mis prioridades con fuentes fiables y una recomendación que explique las ventajas y desventajas.", keywords: ["comparar", "investigar", "elegir", "mejor"] },
    { id: "topic", category: "research", title: "Entender un tema", idea: "Explica un tema desde sus fundamentos con ejemplos concretos y fuentes fiables.", keywords: ["explicar", "entender", "aprender", "investigar"] },
    { id: "meal", category: "daily", title: "Planear las comidas de la semana", idea: "Crea un menú semanal según mis preferencias, tiempo y presupuesto, con una lista de compras.", keywords: ["planear", "comida", "cena", "cocinar"] },
    { id: "trip", category: "daily", title: "Planear unas vacaciones", idea: "Planea un viaje según mi destino, fechas, presupuesto e intereses con tiempos de traslado realistas.", keywords: ["planear", "viaje", "vacaciones", "viajar"] },
    { id: "pitch", category: "business", title: "Describir mi idea de negocio", idea: "Convierte mi idea de negocio en una presentación clara del problema, solución y diferencia sin inventar afirmaciones.", keywords: ["negocio", "presentación", "empresa", "escribir"] },
    { id: "meeting", category: "business", title: "Resumir una reunión de trabajo", idea: "Convierte mis notas de reunión en decisiones, tareas, responsables y preguntas pendientes sin inventar datos.", keywords: ["reunión", "notas", "resumir", "trabajo"] },
    { id: "story", category: "creative", title: "Planear una historia", idea: "Desarrolla mi idea de una historia con una premisa atractiva, personajes creíbles y un esquema de la trama.", keywords: ["escribir", "historia", "novela", "crear"] },
    { id: "image", category: "creative", title: "Describir una imagen para crear", idea: "Convierte mi idea visual en un prompt para generar una imagen con sujeto, composición, iluminación y estilo.", keywords: ["imagen", "diseñar", "crear", "foto"] },
  ],
  ru: [
    { id: "email", category: "writing", title: "Написать письмо", idea: "Напиши письмо с просьбой продлить срок: честно и профессионально, без лишних объяснений.", keywords: ["написать", "напиши", "письмо", "сообщение"] },
    { id: "edit", category: "writing", title: "Улучшить текст", idea: "Отредактируй мой черновик для ясности, сохранив мой стиль и смысл.", keywords: ["исправить", "редактировать", "текст", "улучшить"] },
    { id: "feature", category: "coding", title: "Спланировать приложение или сайт", idea: "Преврати идею функции в план реализации для моего проекта с проверяемыми критериями готовности.", keywords: ["создать", "код", "приложение", "сайт"] },
    { id: "debug", category: "coding", title: "Исправить ошибку в коде", idea: "Помоги найти причину ошибки в коде, предложить минимальное исправление и проверить регрессии.", keywords: ["исправить", "ошибка", "код", "баг"] },
    { id: "compare", category: "research", title: "Сравнить варианты перед покупкой", idea: "Сравни варианты по моим приоритетам с надёжными источниками, рекомендацией и объяснением компромиссов.", keywords: ["сравнить", "выбрать", "лучший", "исследовать"] },
    { id: "topic", category: "research", title: "Разобраться в теме", idea: "Объясни тему с основ, с конкретными примерами, типичными заблуждениями и надёжными источниками.", keywords: ["объяснить", "объясни", "понять", "изучить"] },
    { id: "meal", category: "daily", title: "Составить меню на неделю", idea: "Составь меню на неделю с учётом моих предпочтений, времени и бюджета, со списком покупок.", keywords: ["план", "еда", "ужин", "готовить"] },
    { id: "trip", category: "daily", title: "Спланировать отпуск", idea: "Спланируй путешествие по моему направлению, датам, бюджету и интересам с реалистичным временем в пути.", keywords: ["план", "поездка", "путешествие", "отпуск"] },
    { id: "pitch", category: "business", title: "Описать бизнес-идею", idea: "Преврати бизнес-идею в понятную презентацию проблемы клиента, решения и отличий без выдуманных заявлений.", keywords: ["бизнес", "презентация", "стартап", "написать"] },
    { id: "meeting", category: "business", title: "Подвести итоги рабочей встречи", idea: "Преврати заметки встречи в решения, задачи, ответственных и открытые вопросы, не выдумывая недостающие детали.", keywords: ["встреча", "заметки", "резюме", "работа"] },
    { id: "story", category: "creative", title: "Придумать историю", idea: "Развей мою идею истории: интересная завязка, правдоподобные персонажи и план сюжета.", keywords: ["написать", "история", "роман", "создать"] },
    { id: "image", category: "creative", title: "Описать картинку для создания", idea: "Преврати визуальную идею в промпт для генерации изображения: объект, композиция, освещение и стиль.", keywords: ["картинка", "изображение", "дизайн", "фото"] },
  ],
};
