import { Wand2, Gauge, Boxes } from "lucide-react";

const FEATURES = [
  {
    icon: Wand2,
    title: "Tool-tuned prompts",
    body: "Cursor wants codebase context and file paths. Claude wants XML and explicit success criteria. ChatGPT wants persona and few-shot. PromptOS knows the difference.",
    accent: "from-clay-100/80 to-cream-50",
  },
  {
    icon: Gauge,
    title: "Six-dimension score",
    body: "Every prompt is rated on clarity, context, constraints, examples, output format, and tool fit. Each dimension comes with one actionable tip to push the score up.",
    accent: "from-cream-200/80 to-cream-50",
  },
  {
    icon: Boxes,
    title: "Export-ready output",
    body: "Copy as plain text, download as markdown, or send straight to your tool. Soon: Chrome extension to improve prompts anywhere on the web.",
    accent: "from-clay-50/80 to-cream-50",
  },
];

export function FeatureTriad() {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {FEATURES.map((feature) => (
        <article
          key={feature.title}
          className="group relative rounded-2xl border border-ink-100/70 bg-white card-soft overflow-hidden p-7 hover:card-soft-lg transition-all"
        >
          {/* Subtle warm gradient backdrop */}
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-50 pointer-events-none`} />

          <div className="relative">
            <div className="size-11 rounded-xl bg-white border border-ink-100 flex items-center justify-center mb-5 group-hover:border-clay-300/50 transition-colors">
              <feature.icon className="size-5 text-clay-600" strokeWidth={1.75} />
            </div>
            <h3 className="font-serif text-2xl font-medium text-ink-900 mb-2.5 leading-tight">
              {feature.title}
            </h3>
            <p className="text-[15px] text-ink-500 leading-relaxed">
              {feature.body}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
