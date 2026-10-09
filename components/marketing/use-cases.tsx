import { ArrowRight } from "lucide-react";

interface UseCase {
  tool: string;
  toolColor: string;
  title: string;
  roughInput: string;
  expectedOutput: string;
  whyUmprompt: string;
  score: number;
}

const USE_CASES: UseCase[] = [
  {
    tool: "Coding",
    toolColor: "text-ink-700 bg-cream-100 border-ink-200",
    title: "Build a SaaS feature from a rough idea",
    roughInput:
      "Add a usage dashboard to my SaaS showing daily active users, revenue, and churn",
    expectedOutput:
      "A step-by-step prompt with file paths, component breakdown, stack constraints, and acceptance criteria, ready for your coding assistant.",
    whyUmprompt:
      "A useful coding prompt includes file context, focused tasks, and clear acceptance criteria. Umprompt adds that structure to your rough idea.",
    score: 93,
  },
  {
    tool: "Research",
    toolColor: "text-clay-700 bg-clay-50 border-clay-200/60",
    title: "Research and strategy prompts",
    roughInput:
      "Analyze the top 5 competitors in the AI writing tools space — pricing, positioning, strengths, and gaps",
    expectedOutput:
      "A structured research prompt with a clear goal, scope, comparison criteria, and output sections for your AI assistant.",
    whyUmprompt:
      "A focused research prompt defines the question, relevant context, and expected output. Umprompt turns these into clear instructions.",
    score: 89,
  },
  {
    tool: "Writing",
    toolColor: "text-ink-600 bg-white border-ink-200",
    title: "Sales, email, and workflow prompts",
    roughInput:
      "Write a 3-email cold outreach sequence targeting early-stage SaaS founders for a developer tools product",
    expectedOutput:
      "A persona-driven prompt with tone guidelines, example emails, and exact deliverables — a full sequence, not a vague instruction.",
    whyUmprompt:
      "A useful writing prompt identifies the audience, tone, and deliverables. Umprompt makes those instructions clear without tying them to one AI provider.",
    score: 86,
  },
];

export function UseCasesDeep() {
  return (
    <div className="space-y-5">
      {USE_CASES.map((uc) => (
        <div
          key={uc.title}
          className="rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden"
        >
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ink-100/60">
            {/* Left: rough input */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${uc.toolColor}`}
                >
                  {uc.tool}
                </span>
                <span className="text-[11px] font-mono font-medium text-clay-600 bg-clay-50 border border-clay-200/60 rounded-full px-2 py-0.5">
                  {uc.score}/100
                </span>
              </div>
              <h3 className="font-serif text-xl font-medium text-ink-900 mb-3 leading-snug">
                {uc.title}
              </h3>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400 mb-1.5">
                Rough idea
              </div>
              <div className="rounded-lg bg-cream-100/70 border border-ink-100/60 px-3 py-2.5 text-[13px] text-ink-700 leading-relaxed font-mono">
                &ldquo;{uc.roughInput}&rdquo;
              </div>
            </div>

            {/* Center: expected output */}
            <div className="p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400 mb-1.5">
                What you get
              </div>
              <p className="text-[14px] text-ink-700 leading-relaxed mb-4">
                {uc.expectedOutput}
              </p>
              <div className="flex items-center gap-1.5 text-[12px] text-clay-600 font-medium">
                <span>Scored, optimized, and saved</span>
                <ArrowRight className="size-3.5" />
              </div>
            </div>

            {/* Right: why Umprompt */}
            <div className="p-6 bg-cream-50/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400 mb-1.5">
                Why Umprompt
              </div>
              <p className="text-[14px] text-ink-600 leading-relaxed">
                {uc.whyUmprompt}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
