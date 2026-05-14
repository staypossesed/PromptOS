import { Wand2, Gauge, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Wand2,
    title: "Tool-tuned generation",
    body: "Cursor wants file paths and step-by-step instructions. Claude wants XML tags and explicit success criteria. ChatGPT wants persona and few-shot examples. Umprompt knows the difference — and structures the output accordingly.",
    accent: "from-clay-100/80 to-cream-50",
  },
  {
    icon: Gauge,
    title: "Six-dimension score",
    body: "Every prompt is rated on Clarity, Context, Constraints, Examples, Output Format, and Tool Fit — each 0 to 100. Each dimension comes with one concrete, actionable tip you can apply immediately.",
    accent: "from-cream-200/80 to-cream-50",
  },
  {
    icon: TrendingUp,
    title: "One-click optimization",
    body: 'Click "Optimize weak dimensions" and Umprompt rewrites the prompt targeting every low-scoring area using the exact tips from your score. A before → after comparison confirms the improvement.',
    accent: "from-clay-50/80 to-cream-50",
  },
];

export function FeatureTriad() {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {FEATURES.map((feature) => (
        <article
          key={feature.title}
          className="group relative rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden p-7 hover:card-soft-lg transition-all"
        >
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
