import type { AppLanguage } from "@/types/language";
import type { WritingLexicon } from "@/lib/writing-lexicon";

export const WRITING_CONSENT_VERSION = 2;
export const MAX_WRITING_PREFIX = 4000;
export const MAX_WRITING_SUFFIX = 100;
export interface WritingSuggestion { prefix: string; suffix: string; source: "local" | "ai" }

export const writingCopy = {
  en: {
    toggle: "More tailored AI suggestions", local: "Instant word completions · text stays on this device", shortcut: "Tab: next word", acceptWord: "Add word", acceptAll: "Add all",
    enable: "Enable AI autocomplete", disable: "Turn AI off", offHint: "For sentence suggestions based on your whole idea, you can also enable AI autocomplete.", long: "AI autocomplete supports up to 4,000 characters. You can keep writing and continue normally.",
    title: "Help me find the next words", suggestion: "You could add", accept: "Use suggestion", dismiss: "Hide suggestion",
    consentTitle: "Allow AI suggestions while you type?",
    consent: "When this is on, Umprompt sends the text in this box to its configured AI provider, Anthropic or OpenRouter, after short pauses—even before you press Continue. It does not read other fields, your clipboard, or your saved personal details. Avoid passwords and private identifiers.",
    allow: "Allow for this tab", cancel: "Keep simple suggestions", privacy: "Privacy details",
    enabled: "AI autocomplete is on. This field is sent to the AI provider while you type. Turn it off anytime.",
    loading: "Thinking of the next few words…", limited: "AI suggestions are resting. You can keep typing and continue as usual.",
    unavailable: "AI suggestions are unavailable right now. Your text is safe to keep editing.",
    private: "AI suggestions are paused for text that may contain private identifiers. You can still continue.",
    undo: "Undo suggestion", added: "Suggestion added. You can change any words.", empty: "No useful continuation this time. Keep typing to give the AI more context.",
  },
  ru: {
    toggle: "Более точные подсказки ИИ", local: "Мгновенные подсказки слов · текст остаётся на устройстве", shortcut: "Tab — следующее слово", acceptWord: "Добавить слово", acceptAll: "Добавить всё",
    enable: "Включить ИИ-автодополнение", disable: "Выключить ИИ", offHint: "Для подсказок целых фраз по смыслу вашей идеи можно также включить ИИ-автодополнение.", long: "ИИ-автодополнение поддерживает текст до 4000 символов. Можно писать дальше и продолжить как обычно.",
    title: "Помочь подобрать следующие слова", suggestion: "Можно продолжить так", accept: "Добавить", dismiss: "Скрыть подсказку",
    consentTitle: "Включить подсказки ИИ во время ввода?",
    consent: "Если включить эту функцию, Umprompt будет отправлять текст этого поля своему ИИ-провайдеру — Anthropic или OpenRouter — после коротких пауз, ещё до нажатия «Продолжить». Другие поля, буфер обмена и сохранённые личные данные не передаются. Не вводите пароли и личные идентификаторы.",
    allow: "Разрешить для этой вкладки", cancel: "Оставить обычные подсказки", privacy: "О конфиденциальности",
    enabled: "ИИ-автодополнение включено. Текст этого поля передаётся ИИ-провайдеру во время ввода. Можно выключить в любой момент.",
    loading: "Подбираем продолжение…", limited: "Подсказки ИИ пока отдыхают. Можно писать и продолжать как обычно.",
    unavailable: "Подсказки ИИ сейчас недоступны. Ваш текст по-прежнему можно редактировать.",
    private: "Подсказки ИИ приостановлены: в тексте могут быть личные идентификаторы. Можно продолжить без подсказок.",
    undo: "Отменить добавление", added: "Подсказка добавлена. Любые слова можно изменить.", empty: "Сейчас подходящего продолжения нет. Продолжите писать — у ИИ появится больше контекста.",
  },
  es: {
    toggle: "Sugerencias de IA más específicas", local: "Palabras al instante · el texto se queda en tu dispositivo", shortcut: "Tab: siguiente palabra", acceptWord: "Añadir palabra", acceptAll: "Añadir todo",
    enable: "Activar autocompletado con IA", disable: "Desactivar IA", offHint: "También puedes activar la IA para recibir sugerencias de frases según toda tu idea.", long: "El autocompletado con IA admite hasta 4000 caracteres. Puedes seguir escribiendo y continuar con normalidad.",
    title: "Ayúdame a encontrar las siguientes palabras", suggestion: "Puedes añadir", accept: "Añadir sugerencia", dismiss: "Ocultar sugerencia",
    consentTitle: "¿Permitir sugerencias de IA mientras escribes?",
    consent: "Al activar esta opción, Umprompt envía el texto de este campo a su proveedor de IA, Anthropic u OpenRouter, después de breves pausas, incluso antes de pulsar Continuar. No lee otros campos, el portapapeles ni tus datos personales guardados. Evita incluir contraseñas o identificadores privados.",
    allow: "Permitir en esta pestaña", cancel: "Usar solo sugerencias básicas", privacy: "Más sobre privacidad",
    enabled: "El autocompletado con IA está activado. Este campo se envía al proveedor de IA mientras escribes. Puedes desactivarlo cuando quieras.",
    loading: "Buscando cómo continuar…", limited: "Las sugerencias de IA están en pausa. Puedes seguir escribiendo y continuar con normalidad.",
    unavailable: "Las sugerencias de IA no están disponibles ahora. Puedes seguir editando tu texto.",
    private: "Las sugerencias de IA están en pausa porque el texto podría contener identificadores privados. Puedes continuar sin ellas.",
    undo: "Deshacer sugerencia", added: "Sugerencia añadida. Puedes cambiar cualquier palabra.", empty: "No hay una continuación útil por ahora. Sigue escribiendo para dar más contexto a la IA.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

// Reviewed examples, not a model or a record of anyone's writing. Matching is entirely local.
const LOCAL_SENTENCES: Record<AppLanguage, string[]> = {
  en: [
    "Write a polite email asking for an update.", "Write a friendly follow-up email.",
    "Help me write a polite email.", "Help me reply to a difficult message calmly.",
    "I need to write a message asking for more time.", "Help me plan my week with room for rest.",
    "Plan my week around my existing commitments.", "Plan simple meals using ingredients I already have.",
    "Explain this topic in simple words with an example.", "Help me understand this topic step by step.",
    "Help me prepare for an exam with practice questions.", "Prepare me for a job interview one question at a time.",
    "Help me prepare for an exam for my math class.",
    "Help me prepare for the NCLEX with practice questions.", "Help me prepare for the NCLEX in three months, with practice questions and explanations.",
    "Summarize my notes into a short list of next steps.", "Help me compare my options using my priorities.",
    "Improve this message while keeping my meaning.", "Create a study plan that fits my available time.",
    "Help me find a gift based on their interests.", "Turn my rough idea into clear instructions.",
    "Write a short message that sounds friendly and clear.", "Write a cover letter based on my experience.",
    "Write an email asking for more time.", "Write a short post in a friendly tone.",
    "Write a story with a clear beginning and ending.", "Write a resume using the details I provide.",
    "Create a chatbot that answers questions using information I provide.", "Build a website with a simple layout.",
    "Plan a trip around my budget and interests.", "Help me study with practice questions and explanations.",
    "Help me prepare for a job interview one question at a time.", "Find a name for my project and explain the options.",
    "Translate this text while keeping its meaning.", "Fix this code and explain what changed.",
    "Compare these options with a short list of pros and cons.",
  ],
  ru: [
    "Напиши вежливое письмо с просьбой сообщить новости.", "Помоги написать короткое вежливое письмо.",
    "Помоги ответить на сложное сообщение спокойно.", "Мне нужно написать сообщение с просьбой дать больше времени.",
    "Помоги спланировать неделю так, чтобы осталось время на отдых.", "Составь план недели с учётом моих дел.",
    "Составь меню из продуктов, которые уже есть дома.", "Объясни эту тему простыми словами на примере.",
    "Помоги разобраться в этой теме шаг за шагом.", "Помоги подготовиться к экзамену с помощью тренировочных вопросов.",
    "Помоги подготовиться к NCLEX за три месяца с тренировочными вопросами.",
    "Помоги подготовиться к собеседованию, задавая по одному вопросу.", "Составь план учёбы с учётом моего свободного времени.",
    "Выдели из моих заметок основные мысли и следующие шаги.", "Помоги сравнить варианты с учётом моих пожеланий.",
    "Улучши это сообщение, сохранив его смысл.", "Помоги выбрать подарок с учётом интересов человека.",
    "Напиши короткое сообщение понятным и дружелюбным языком.", "Напиши письмо с просьбой дать больше времени.", "Помоги написать письмо с просьбой дать больше времени.",
    "Напиши пост в дружелюбном тоне.", "Напиши резюме на основе моего опыта.",
    "Создай чат-бота, который отвечает по информации о моих товарах.", "Составь план поездки с учётом моего бюджета.",
    "Придумай название для моего проекта и объясни варианты.", "Переведи этот текст, сохранив его смысл.",
    "Исправь этот код и объясни изменения.", "Сравни эти варианты и перечисли плюсы и минусы.",
  ],
  es: [
    "Escribe un correo amable para pedir una actualización.", "Ayúdame a escribir un correo breve y educado.",
    "Ayúdame a responder a un mensaje difícil con calma.", "Necesito escribir un mensaje para pedir más tiempo.",
    "Ayúdame a organizar la semana dejando tiempo para descansar.", "Planifica mi semana teniendo en cuenta mis compromisos.",
    "Planifica comidas sencillas con los ingredientes que ya tengo.", "Explica este tema con palabras sencillas y un ejemplo.",
    "Ayúdame a entender este tema paso a paso.", "Ayúdame a preparar un examen con preguntas de práctica.",
    "Ayúdame a preparar el NCLEX en tres meses con preguntas de práctica.",
    "Ayúdame a preparar una entrevista con una pregunta cada vez.", "Crea un plan de estudio que se adapte a mi tiempo disponible.",
    "Resume mis notas en una lista de próximos pasos.", "Ayúdame a comparar mis opciones según mis prioridades.",
    "Mejora este mensaje sin cambiar su significado.", "Ayúdame a elegir un regalo según sus intereses.",
    "Escribe un mensaje breve con un tono amable.", "Escribe una publicación con un tono cercano.",
    "Escribe un currículum basado en mi experiencia.", "Crea un chatbot que use la información que le proporcione.",
    "Planifica un viaje según mi presupuesto e intereses.", "Busca un nombre para mi proyecto y explica las opciones.",
    "Traduce este texto sin cambiar su significado.", "Corrige este código y explica los cambios.",
    "Compara estas opciones con sus ventajas y desventajas.",
  ],
};

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/’/gu, "'");
const words = (text: string) => Array.from(text.matchAll(/[\p{L}\p{M}\p{N}'’]+|[^\s]/gu), match => ({ text: match[0], start: match.index!, end: match.index! + match[0].length }));

// Public, authored vocabulary only. No user history or downloaded model is needed to finish a word.
const WORDS: Record<AppLanguage, string> = {
  en: `photosynthesis electroencephalogram electroencephalography mitochondria mitochondrial classroom mathematics find finish fix follow focus friendly free feedback family food format financial future flight fitness form facts file first further function fundamental fundraising funding frame framework formula formal foundation full frequently flexible fairness fun fulfilment
    ask answer advice appointment application apply arrange article assistance available activities accessibility accurate adapt analysis audience avoid aware agenda assistant announcement anxiety approach assessment attachment attention author automatic average background balance basic benefits brief budget business calendar career certificate certification challenge change checklist choose clarify clear client coach coding communicate compare complete concise confidence confirm consider constraints contact content context conversation correct course create customer daily deadline decision define delivery describe design details develop different difficult direct document draft easy edit effective email empathetic encourage English error evaluate everyday exam examples explain explanation explore facts fair flexible follow format generate goals guide health helpful honest hours ideas identify illustrate improve include information instructions interview introduce job journey keep kindness language learn learning letter life list look make manageable manager meals meeting message method money month name necessary needs next notes nursing objective offer options order organize outline overview patient personal plan polite practical practise prepare presentation priorities professional progress project provide questions quick readable realistic reason recommend reflect relevant reminder reply report request research respectful result review rewrite roadmap role routine safe save schedule school science scope search select sentence simple simplify skills specific start step story structure study subject suggest summarize support task teach template text thoughtful time title today tomorrow tone topic training translate travel trip understand useful user verify voice week wellbeing work writing year you your zoom young yesterday xylophone xray quality question quote visit value volunteer want write`,
  ru: `фотосинтез митохондрия электроэнцефалограмма перепланировка каузальность найти написать напиши начать настроить научиться объяснить объясни организовать ответить ответ оформить улучшить упростить учиться помочь помоги подготовиться понять планировать придумать проверить перевести переработать рассказать рассчитать решить разобрать разработать сравнить составить создать сформулировать сформулируй формат финансовый фотографию фотография физика функция факты файл фраза
    адрес анализ аудитория безопасно бесплатно бюджет варианты вечер вежливо внимательно вопросы время встречи выбор готовиться график грамотно данные дедлайн день деньги детали диаграмма диалог доверие документ доступно друзья задача задачи заметки знания идеи изучить инструкция информация интересы интервью история источник качество клиент книга код команда комментарий кратко критерии курс легко лечение личный лучше люди математика материалы меню месяц метод мнение модель можно мотивация навыки название наглядно напоминание настройки начало неделя необходимые новости объяснение ограничения обучение отзыв оценка письмо планы поддержка подробно полезно понятный порядок пошагово практика предпочтения пример приоритеты проблема программа продолжить проект просьба профессионально работа расходы рекомендации решение русский результат расписание резюме ресурсы роль семья ситуация сложно слова собеседование сообщение список сроки структура стиль сравнение стратегия студент сценарий таблица текст тема тестирование тон тренировка трудности убрать удобный учебный условия уточнить учитель цель человек четко шаг экзамен эффективность эмпатия язык явление яблоко юрист юмор щадящий честно шансы хорошо хранение циклы цифровой дружелюбно европейский ежедневно европейский жизнь желание здоровье щедро энергия эмоции уникальный дополнительные общение принять платформа рацион`,
  es: `fotosíntesis mitocondria electroencefalograma causalidad buscar busca escribir escribe explicar explica ayudar ayudame preparar planificar organizar crear mejorar comparar corregir resumir traducir encontrar estudiar practicar redactar terminar revisar resolver desarrollar diseñar detallar formular formato fotografia fecha familia factura facil flexible financiero funcion futuro fuentes frecuente formar finalizar
    amable aprender apoyo agenda ahorrar actividades accesible aclarar adaptar adecuado adulto alimentos alternativas analizar antes aplicar audiencia ayuda avanzar basico breve presupuesto calendario cambio carrera carta categoria certificacion claro cliente cocina codigo comunicar completo comprensible compromiso conceptos concreto confianza confirmar consejo consulta contenido contexto conversacion correcto correo curso diario decision definir descripcion detalles dinero documento dudas ejemplo examen experiencia facil familia flexible formulario formato guia habilidades historia horario ideas idioma importante informacion informe ingles instrucciones entrevista explicar leccion lista lectura lenguaje mensaje metodo minutos modelo momento necesidades nombre notas objetivo opciones orden organizar paciente palabras pasos persona plan plazo practica preparar pregunta prioridades problema proceso profesional progreso proyecto proposito razon recibir recomendaciones recordar recursos respuesta resultado resumen revisar rutina seguro sencillo semana servicio significativo simple situacion solicitud soluciones siguiente tabla tarea tecnica texto tiempo titulo tono trabajar trabajo traducir viaje vocabulario voluntario voz verificar ventajas vida visita valor viernes ventana yo joven juicio juego juntos que quien cuando donde como quiero ya hoy ayer yoga zona zoom zoologia xilofono web webinario kilometros universidad utilidad`,
};

const STARTERS: Record<AppLanguage, string[]> = {
  en: "ask build create describe explain find generate help improve join keep learn make name organize plan question rewrite summarize translate understand visit write yield zoom".split(" "),
  ru: "помоги напиши объясни составь найди создай придумай переведи сравни улучши сформулируй расскажи разбери подготовь проверь упрости".split(" "),
  es: "ayudame escribe explica planifica crea busca mejora compara resume traduce organiza corrige encuentra prepara revisa".split(" "),
};

// Whole grammatical connectors are not silently treated as unfinished nouns.
// Other complete words may also be prefixes (class/classroom); those endings
// remain previews and require explicit acceptance.
const BOUNDARIES = new Set("a an and are as at be been but by do for from had has have he her him his i if in is it its me my no not of on or our she so than that the their them then they this to us was we were what when where which who why will with without you your и а в во не ни на по за из от до для при про без как что это я мы ты вы он она оно они мне мой моя мои у с со о об к ко но да или же бы es el la los las un una unos unas de del en con sin para por que y o mi mis me te se su sus al lo le les yo tu si no como cuando donde quien".split(" "));
export const writingWordBoundary = (fragment: string) => BOUNDARIES.has(fold(fragment));

const WORD_INDEX = Object.fromEntries(Object.entries(LOCAL_SENTENCES).map(([language, sentences]) => {
  const locale = language as AppLanguage;
  const entries = new Map<string, { text: string; frequency: number }>();
  const contexts = new Map<string, Map<string, number>>();
  const add = (word: string) => {
    const key = fold(word);
    if (key.length < 2 || !/^\p{L}[\p{L}\p{M}'’-]*$/u.test(word)) return;
    const existing = entries.get(key);
    entries.set(key, { text: existing?.text ?? word.toLowerCase(), frequency: (existing?.frequency ?? 0) + 1 });
  };
  for (const word of WORDS[locale].split(/\s+/u)) add(word);
  for (const sentence of sentences) {
    const tokens = words(sentence).filter(token => /^\p{L}/u.test(token.text)).map(token => token.text);
    tokens.forEach(add);
    for (let i = 1; i < tokens.length; i++) for (let size = 1; size <= Math.min(3, i); size++) {
      const key = tokens.slice(i - size, i).map(fold).join(" ");
      const next = contexts.get(key) ?? new Map<string, number>();
      const word = fold(tokens[i]); next.set(word, (next.get(word) ?? 0) + 1); contexts.set(key, next);
    }
  }
  return [language, { entries, contexts }];
})) as Record<AppLanguage, { entries: Map<string, { text: string; frequency: number }>; contexts: Map<string, Map<string, number>> }>;

function wordEnding(prefix: string, language: AppLanguage, lexicon?: WritingLexicon): string {
  const fragment = prefix.match(/[\p{L}\p{M}][\p{L}\p{M}'’-]*$/u);
  if (!fragment && !/\s$/u.test(prefix)) return "";
  const typed = fragment?.[0] ?? "";
  const start = fragment ? fragment.index! : prefix.length;
  const context = words(prefix.slice(0, start)).filter(token => /^\p{L}/u.test(token.text)).map(token => fold(token.text));
  const input = fold(typed);
  if (input.length >= 2 && writingWordBoundary(typed)) return "";
  let best = "", bestScore = -1;
  for (const [word, entry] of WORD_INDEX[language].entries) {
    if (!word.startsWith(input) || word.length <= input.length) continue;
    let score = entry.frequency, contextual = false;
    for (let size = Math.min(3, context.length); size >= 1; size--) {
      const count = WORD_INDEX[language].contexts.get(context.slice(-size).join(" "))?.get(word) ?? 0;
      if (count) { contextual = true; score += size * 1000 + count; }
    }
    if (!typed && !contextual) continue;
    if (!context.length) {
      const index = STARTERS[language].findIndex(starter => fold(starter) === word);
      if (index >= 0) score += 10000 - index;
    }
    if (score > bestScore) { best = entry.text; bestScore = score; }
  }
  // Contextual pairs and first-word actions outrank raw corpus frequency. In
  // unfamiliar contexts prefer the broader frequency list to a small seed list.
  if (typed && lexicon && bestScore < 1000) {
    const suffix = normalizeWritingSuffix(prefix, lexicon.complete(typed));
    if (suffix) return suffix;
  }
  if (!best) return "";
  // Completing a word never rewrites the letters already entered.
  let end = 0;
  while (end < best.length && fold(best.slice(0, end)).length < input.length) end++;
  let suffix = best.slice(end);
  if (typed.length > 1 && typed === typed.toUpperCase()) suffix = suffix.toUpperCase();
  return normalizeWritingSuffix(prefix, suffix);
}

// Generate grammatical request variants once, rather than requiring an exact starter sentence.
const LOCAL_VARIANTS = Object.fromEntries(Object.entries(LOCAL_SENTENCES).map(([language, sentences]) => {
  const variants: string[] = [];
  for (const sentence of sentences) {
    variants.push(sentence);
    if (language === "en") {
      const action = sentence.replace(/^Help me (?:to )?/u, "");
      if (/^I /u.test(action)) continue;
      const lower = action[0].toLowerCase() + action.slice(1);
      variants.push(...["Help me ", "Help me to ", "Please ", "Please help me ", "Please help me to ", "I want to ", "I need to ", "I would like to ", "I'd like to ", "Can you ", "Can you help me ", "Can you help me to "].map(start => start + lower));
    } else if (language === "ru") {
      if (sentence.startsWith("Помоги ")) variants.push(sentence.replace(/^Помоги /u, "Помоги мне "));
      variants.push("Пожалуйста, " + sentence[0].toLowerCase() + sentence.slice(1));
    } else {
      const action = sentence.replace(/^Ayúdame a /u, "");
      if (action !== sentence) variants.push(...["Necesito ", "Quiero ", "Me gustaría ", "Puedes ayudarme a ", "Por favor, ayúdame a "].map(start => start + action));
    }
  }
  return [language, Array.from(new Set(variants)).map(text => ({ text, tokens: words(text) }))];
})) as Record<AppLanguage, { text: string; tokens: ReturnType<typeof words> }[]>;

const LOCAL_START_INDEX = Object.fromEntries(Object.entries(LOCAL_VARIANTS).map(([language, candidates]) => {
  const index = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const first = fold(candidate.tokens[0].text);
    for (let size = 1; size <= first.length; size++) {
      const key = first.slice(0, size);
      const group = index.get(key) ?? []; group.push(candidate); index.set(key, group);
    }
  }
  return [language, index];
})) as Record<AppLanguage, Map<string, typeof LOCAL_VARIANTS.en>>;

function matchedEnding(prefix: string, candidate: typeof LOCAL_VARIANTS.en[number], input: ReturnType<typeof words>): string {
  if (input.length > candidate.tokens.length) return "";
  for (let i = 0; i < input.length; i++) {
    const typed = fold(input[i].text), expected = fold(candidate.tokens[i].text);
    const partial = i === input.length - 1 && !/\s$/u.test(prefix);
    if (partial ? !expected.startsWith(typed) : typed !== expected) return "";
  }
  const last = candidate.tokens[input.length - 1];
  const typed = fold(input[input.length - 1].text);
  let end = last.start;
  while (end < last.end && fold(candidate.text.slice(last.start, end)).length < typed.length) end++;
  return normalizeWritingSuffix(prefix, candidate.text.slice(end));
}

function contextualEnding(prefix: string, language: AppLanguage): string {
  const text = fold(prefix).trim();
  const knownTask = /(?:\b(?:write|email|message|plan|study|prepare|explain|chatbot|compare|meal|dinner|trip|interview|code|project)\b|напиш|письм|сообщен|план|подготов|объясн|чат.?бот|сравн|экзамен|код|проект|\b(?:escrib|correo|mensaje|planifica|prepar|explica|chatbot|compara|comida|viaje|entrevista|codigo|proyecto))/u.test(text);
  if (!knownTask) return "";
  const study = /(?:nclex|exam|study|экзамен|учеб|учёб|подготов|examen|estudi)/u.test(text);
  const writing = /(?:write|email|message|напиш|письм|сообщен|escrib|correo|mensaje)/u.test(text);
  let ending = "";
  if (language === "en") {
    if (/\bwith$/u.test(text)) ending = study ? " practice questions and short explanations." : writing ? " a clear and respectful tone." : " clear steps I can follow.";
    else if (/\bwithout$/u.test(text)) ending = " making up details I haven't provided.";
    else if (/\busing$/u.test(text)) ending = " the information I provide.";
    else if (/\bby$/u.test(text)) ending = study ? " asking me one question at a time." : " explaining each step clearly.";
    else if (/\band$/u.test(text)) ending = writing ? " keep the tone clear and respectful." : " explain the next steps clearly.";
    else if (/\bso i can$/u.test(text)) ending = " understand what to do next.";
  } else if (language === "ru") {
    if (/(?:^|\s)и$/u.test(text)) ending = writing ? " сохрани мой смысл." : " объясни следующие шаги простыми словами.";
    else if (/(?:с учетом|учитывая)$/u.test(text)) ending = " мои пожелания и доступное время.";
    else if (/(?:добавь|используя)$/u.test(text)) ending = study ? " тренировочные вопросы с объяснениями." : " понятные примеры.";
    else if (/(?:чтобы я мог|чтобы я могла)$/u.test(text)) ending = " понять, что делать дальше.";
  } else {
    if (/\bcon$/u.test(text)) ending = study ? " preguntas de práctica y explicaciones claras." : " pasos claros y ejemplos sencillos.";
    else if (/\bsin$/u.test(text)) ending = " inventar detalles que no he dado.";
    else if (/\busando$/u.test(text)) ending = " la información que te proporcione.";
    else if (/\by$/u.test(text)) ending = " explica los siguientes pasos con claridad.";
    else if (/\bpara que pueda$/u.test(text)) ending = " entender qué hacer después.";
  }
  return normalizeWritingSuffix(prefix, ending);
}

export function writingLanguage(text: string, fallback: AppLanguage): AppLanguage {
  if (/[\u0400-\u04ff]/u.test(text)) return "ru";
  if (/[¿¡ñáéíóúü]/iu.test(text) || /\b(quiero|necesito|ayudame|ayúdame|escribe|escribir|explica|planifica|preparar|correo|semana|comidas|para|una|mis|crea|crear|organiza|corrige|traduce|compara|busca)\b/iu.test(text)) return "es";
  if (/\b(help|write|prepare|plan|explain|need|want|email|please|summarize|reply|with|without|create|build|fix|find|compare|improve|translate)\b/iu.test(text)) return "en";
  const first = fold(text).trim().split(/\s/u)[0];
  if (/^[a-z]$/iu.test(first)) return fallback === "es" ? "es" : "en";
  if (first.length >= 1) {
    const starters = (["en", "es"] as const).filter(language => LOCAL_VARIANTS[language].some(candidate => fold(candidate.tokens[0].text).startsWith(first)));
    if (starters.length === 1) return starters[0];
  }
  if (fallback === "ru" && /^[a-z]/iu.test(text.trim())) return "en";
  return fallback;
}

export function sensitiveWritingText(text: string): boolean {
  return /\b(?:sk[-_](?:live|test|ant)[-_]|AKIA[A-Z0-9]{12}|eyJ[A-Za-z0-9_-]{20,}\.)/u.test(text) ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text) ||
    /\b\d{3}-\d{2}-\d{4}\b/u.test(text) ||
    /(?:\+?\d[\d ().-]{8,}\d)/u.test(text) ||
    /(?:password|пароль|contraseña)\s*(?:is\s+|es\s+|это\s+|[:=]\s*)\S+/iu.test(text);
}

export function normalizeWritingSuffix(prefix: string, raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 240 || /[\r\n\u0000-\u001f]/u.test(raw)) return "";
  let suffix = raw.replace(/\s+$/u, "");
  if (!suffix.trim() || suffix.length > MAX_WRITING_SUFFIX || suffix.trim().split(/\s+/u).length > 12) return "";
  if (/[<>`\[\]{}]/u.test(suffix) || /https?:\/\//iu.test(suffix) || sensitiveWritingText(suffix)) return "";
  if (/^(?:here(?:'s| is)|sure[,!]|конечно[,!]|вот\s|claro[,!:])/iu.test(suffix.trim())) return "";
  if (prefix.trim().length > 12 && suffix.toLocaleLowerCase().includes(prefix.trim().toLocaleLowerCase())) return "";
  const numbers = suffix.match(/\d+(?:[.,]\d+)*/gu) ?? [];
  const suppliedNumbers: string[] = prefix.match(/\d+(?:[.,]\d+)*/gu) ?? [];
  if (numbers.some(number => !suppliedNumbers.includes(number))) return "";
  if (/\s$/u.test(prefix)) suffix = suffix.replace(/^\s+/u, "");
  return suffix;
}

export function localWritingSuggestion(prefix: string, language: AppLanguage, lexicon?: WritingLexicon): string {
  if (sensitiveWritingText(prefix) || prefix.length > MAX_WRITING_PREFIX || /[.!?。！？]$/u.test(prefix.trimEnd())) return "";
  const input = words(prefix);
  if (!prefix.trim() || !input.length) return "";
  for (const candidate of LOCAL_START_INDEX[language].get(fold(input[0].text)) ?? []) {
    const suffix = matchedEnding(prefix, candidate, input);
    if (suffix) return suffix;
  }
  return contextualEnding(prefix, language) || wordEnding(prefix, language, lexicon);
}

export const authoredWritingVocabulary = (language: AppLanguage): readonly string[] => [...WORD_INDEX[language].entries.values()].map(entry => entry.text);

export function nextWritingWord(suffix: string): string {
  const first = suffix.match(/^\s*\S+\s*/u)?.[0] ?? "";
  if (!first.trim()) return "";
  return /[\p{L}\p{N}]$/u.test(first) ? first + " " : first;
}

// A suffix continuing the letters of the current word may finish that word only.
// This prevents a provider from attaching an invented clause after a partial noun.
export function normalizeContextualWriting(prefix: string, raw: unknown): string {
  const suffix = normalizeWritingSuffix(prefix, raw);
  if (!suffix || !/\p{L}$/u.test(prefix) || /^\s/u.test(suffix)) return suffix;
  const wordEnd = suffix.match(/^[\p{L}\p{M}'’-]+/u)?.[0] ?? "";
  if (/[а-яё]+$/iu.test(prefix) && /[a-z]/iu.test(wordEnd)) return "";
  return normalizeWritingSuffix(prefix, wordEnd);
}

export function suggestedWritingWord(prefix: string, suffix: string): string {
  const part = nextWritingWord(suffix).trim();
  const fragment = !/^\s/u.test(suffix) ? prefix.match(/[\p{L}\p{M}][\p{L}\p{M}'’-]*$/u)?.[0] ?? "" : "";
  return fragment + part;
}

export function continueWritingSuggestion(candidate: WritingSuggestion | null, value: string): WritingSuggestion | null {
  if (!candidate || value.length < candidate.prefix.length || !(candidate.prefix + candidate.suffix).startsWith(value) || sensitiveWritingText(value)) return null;
  const suffix = normalizeWritingSuffix(value, (candidate.prefix + candidate.suffix).slice(value.length));
  return suffix ? { ...candidate, prefix: value, suffix } : null;
}

export function eligibleWritingPrefix(prefix: string): boolean {
  return /\p{L}/u.test(prefix) && prefix.length <= MAX_WRITING_PREFIX && !/[.!?。！？]$/u.test(prefix.trimEnd()) && !sensitiveWritingText(prefix);
}

export function currentWritingSuggestion(candidate: WritingSuggestion | null, prefix: string, enabled: boolean): WritingSuggestion | null {
  return enabled && candidate?.prefix === prefix ? candidate : null;
}

export function appendWritingSuggestion(prefix: string, suffix: string, maximum = 4000): string | null {
  const valid = normalizeWritingSuffix(prefix, suffix);
  return valid && prefix.length + valid.length <= maximum ? prefix + valid : null;
}
