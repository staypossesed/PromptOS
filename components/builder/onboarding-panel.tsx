"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Zap, PenLine, Search, Bot, Mail, FileText } from "lucide-react";
import { track } from "@/lib/analytics";
import type { ToolId } from "@/lib/mock-data";
import type { PromptContext } from "@/types/prompt";
import { useTranslations } from "@/lib/i18n/use-translations";

const STORAGE_KEY = "umprompt_onboarding_seen";

interface OnboardingOption {
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  tool: ToolId;
  idea: string;
  context?: PromptContext;
}

// Ideas are intentionally kept in English — they are input text that gets
// passed to the AI, and the AI will generate the prompt in the appropriate
// output language. Translating the idea text would break the example intent.
const OPTIONS: OnboardingOption[] = [
  {
    labelKey: "onboarding.buildWithCursor",
    icon: Zap,
    tool: "cursor",
    idea: "Build a user settings page for a Next.js SaaS — allow users to update their profile, email, and notification preferences",
    context: { projectType: "Next.js 15 App Router", constraints: "TypeScript strict mode" },
  },
  {
    labelKey: "onboarding.writeWithChatGPT",
    icon: PenLine,
    tool: "chatgpt",
    idea: "Write a 3-email cold outreach sequence for [your product] targeting [your audience]",
    context: { outputFormat: "3 emails with subject lines and CTAs" },
  },
  {
    labelKey: "onboarding.researchWithClaude",
    icon: Search,
    tool: "claude",
    idea: "Research and analyze the top 5 competitors in [your market] — pricing, positioning, strengths, and strategic gaps",
    context: { outputFormat: "Structured report with executive summary and competitor deep-dives" },
  },
  {
    labelKey: "onboarding.automateWithN8n",
    icon: Bot,
    tool: "chatgpt",
    idea: "Build an n8n automation that captures new leads from a Typeform, enriches them with Clearbit, and adds them to HubSpot",
    context: { projectType: "n8n automation workflow" },
  },
  {
    labelKey: "onboarding.salesCopy",
    icon: Mail,
    tool: "chatgpt",
    idea: "Write a follow-up email sequence for sales prospects who attended a demo but haven't replied in 5 days",
    context: { outputFormat: "3 emails with subject lines. Short, direct, no filler." },
  },
  {
    labelKey: "onboarding.createContent",
    icon: FileText,
    tool: "claude",
    idea: "Create a landing page for [your product] — hero headline, 3 benefit sections, social proof, and CTA",
    context: { outputFormat: "Full page copy with labeled sections and brackets for customization" },
  },
];

interface OnboardingPanelProps {
  onSelect: (idea: string, tool: ToolId, context: PromptContext) => void;
}

export function OnboardingPanel({ onSelect }: OnboardingPanelProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {}
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  function handleSelect(opt: OnboardingOption) {
    track("onboarding_option_selected", { option: opt.labelKey });
    onSelect(opt.idea, opt.tool, opt.context ?? {});
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-clay-200/50 bg-gradient-to-br from-clay-50/50 to-cream-50/60 p-5 mb-5 relative card-soft">
      <button
        onClick={dismiss}
        className="absolute top-3.5 right-3.5 text-ink-300 hover:text-ink-500 transition-colors"
        aria-label={t("common.close")}
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-clay-500 shrink-0" />
        <span className="text-sm font-semibold text-ink-800">
          {t("onboarding.title")}
        </span>
      </div>
      <p className="text-[12px] text-ink-500 mb-4 leading-relaxed">
        {t("onboarding.subtitle")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.labelKey}
              onClick={() => handleSelect(opt)}
              className="flex items-center gap-2 rounded-xl border border-ink-100/70 bg-white/80 px-3 py-2.5 text-left text-xs font-medium text-ink-700 hover:border-clay-300/60 hover:bg-white hover:text-ink-900 hover:card-soft transition-all"
            >
              <Icon className="size-3.5 shrink-0 text-ink-400" />
              <span className="leading-snug">{t(opt.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
