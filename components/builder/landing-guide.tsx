import type { AppLanguage } from "@/types/language";

const copy = {
  en: {
    title: "From a few words to a useful next step", intro: "You bring the idea. We help you make it clear.",
    steps: [["Tell us what you want", "A message, a plan, an explanation, or help studying. Your own words are enough."], ["Add a few details", "Answer a few simple questions. Skip anything you do not know yet."], ["Choose your result", "Get clear instructions for your AI assistant, or a first draft right here."]],
    faq: "Before you start", questions: [["Do I need to know how to use AI?", "No. Describe what you want to do in everyday words. Umprompt helps you add the details that matter."], ["What will I get?", "Choose instructions to copy into your preferred AI assistant, or a draft, plan, or explanation in Umprompt. Review the result before using it."], ["Do I need an account or a payment card?", "You can complete one trial task without an account or payment card. A free account lets you save your work and start up to 7 ideas a week. Paid plans are optional."], ["What happens to what I write?", "When you ask us to prepare a result, your idea and selected details are sent to Umprompt’s AI provider. A result enters your saved history only when you choose Save. See Privacy for more information."]],
    cta: "Start with something on your mind", button: "Try my first idea", note: "A few words are enough. No account needed for your trial."
  },
  ru: {
    title: "От пары слов — к понятному следующему шагу", intro: "Вы рассказываете об идее. Мы помогаем её сформулировать.",
    steps: [["Расскажите, что хотите сделать", "Написать сообщение, составить план, разобраться в теме или подготовиться к экзамену. Просто своими словами."], ["Уточните несколько деталей", "Ответьте на простые вопросы. Если пока не знаете ответ, пропустите его."], ["Выберите, что хотите получить", "Готовые инструкции для вашего ИИ-помощника или первый вариант результата прямо здесь."]],
    faq: "Что полезно знать перед началом", questions: [["Нужно ли уметь пользоваться ИИ?", "Нет. Опишите обычными словами, что хотите сделать. Umprompt поможет добавить важные детали."], ["Что я получу?", "На выбор: инструкции, которые можно скопировать в своего ИИ-помощника, или черновик, план, объяснение в Umprompt. Перед использованием проверьте результат."], ["Нужны ли регистрация и банковская карта?", "Одну пробную задачу можно выполнить без регистрации и карты. Бесплатный аккаунт позволяет сохранять результаты и начинать до 7 задач в неделю. Платные тарифы — по желанию."], ["Что происходит с моим текстом?", "Когда вы просите подготовить результат, ваша идея и выбранные детали отправляются ИИ-провайдеру Umprompt. В сохранённую историю результат попадёт только по кнопке «Сохранить». Подробнее — в разделе «Конфиденциальность»."]],
    cta: "Начните с того, что сейчас важно для вас", button: "Попробовать свою идею", note: "Достаточно нескольких слов. Для пробной задачи регистрация не нужна."
  },
  es: {
    title: "De unas pocas palabras a un siguiente paso claro", intro: "Tú traes la idea. Te ayudamos a darle forma.",
    steps: [["Cuéntanos qué quieres hacer", "Escribir un mensaje, organizarte, entender un tema o estudiar. Basta con tus propias palabras."], ["Añade algunos detalles", "Responde unas preguntas sencillas. Si aún no sabes algo, puedes saltarlo."], ["Elige qué quieres recibir", "Instrucciones para tu asistente de IA o un primer borrador aquí mismo."]],
    faq: "Antes de empezar", questions: [["¿Necesito saber usar la IA?", "No. Explica con palabras cotidianas lo que quieres hacer. Umprompt te ayuda a añadir los detalles importantes."], ["¿Qué voy a recibir?", "Puedes elegir instrucciones para copiar en tu asistente de IA o un borrador, un plan o una explicación en Umprompt. Revisa el resultado antes de usarlo."], ["¿Necesito una cuenta o una tarjeta?", "Puedes completar una tarea de prueba sin cuenta ni tarjeta. Una cuenta gratuita permite guardar resultados y empezar hasta 7 ideas por semana. Los planes de pago son opcionales."], ["¿Qué pasa con lo que escribo?", "Cuando pides un resultado, tu idea y los detalles seleccionados se envían al proveedor de IA de Umprompt. Solo se añade al historial cuando eliges Guardar. Consulta Privacidad para saber más."]],
    cta: "Empieza con algo que tengas en mente", button: "Probar mi primera idea", note: "Unas pocas palabras bastan. No necesitas una cuenta para probar."
  }
};

export function LandingGuide({ language, onStart }: { language: AppLanguage; onStart: () => void }) {
  const c = copy[language];
  return <div className="landing-guide">
    <section aria-labelledby="landing-how-title"><div className="beginner-section-heading"><div><h2 id="landing-how-title">{c.title}</h2><p>{c.intro}</p></div></div>
      <ol className="landing-how">{c.steps.map(([title, description], index) => <li key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
    </section>
    <section className="landing-faq" aria-labelledby="landing-faq-title"><h2 id="landing-faq-title">{c.faq}</h2><div>{c.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <section className="landing-invitation"><h2>{c.cta}</h2><p>{c.note}</p><button className="beginner-primary" type="button" onClick={onStart}>{c.button}<span aria-hidden="true">↗</span></button></section>
  </div>;
}
