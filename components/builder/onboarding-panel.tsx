"use client";

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { track } from "@/lib/analytics";
import type { ToolId } from "@/lib/mock-data";
import type { PromptContext } from "@/types/prompt";

const STORAGE_KEY = "umprompt_onboarding_seen";

interface OnboardingOption {
  label: string;
  emoji: string;
  tool: ToolId;
  idea: string;
  context?: PromptContext;
}

const OPTIONS: OnboardingOption[] = [
  {
    label: "Build with Cursor",
    emoji: "⚡",
    tool: "cursor",
    idea: "Build a user settings page for a Next.js SaaS — allow users to update their profile, email, and notification preferences",
    context: {
      projectType: "Next.js 15 App Router",
      constraints: "TypeScript strict mode",
    },
  },
  {
    label: "Write with ChatGPT",
    emoji: "✍️",
    tool: "chatgpt",
    idea: "Write a 3-email cold outreach sequence for [your product] targeting [your audience]",
    context: { outputFormat: "3 emails with subject lines and CTAs" },
  },
  {
    label: "Research with Claude",
    emoji: "🔍",
    tool: "claude",
    idea: "Research and analyze the top 5 competitors in [your market] — pricing, positioning, strengths, and strategic gaps",
    context: {
      outputFormat:
        "Structured report with executive summary and competitor deep-dives",
    },
  },
  {
    label: "Automate with n8n",
    emoji: "🤖",
    tool: "chatgpt",
    idea: "Build an n8n automation that captures new leads from a Typeform, enriches them with Clearbit, and adds them to HubSpot",
    context: { projectType: "n8n automation workflow" },
  },
  {
    label: "Sales/outreach copy",
    emoji: "📧",
    tool: "chatgpt",
    idea: "Write a follow-up email sequence for sales prospects who attended a demo but haven't replied in 5 days",
    context: {
      outputFormat: "3 emails with subject lines. Short, direct, no filler.",
    },
  },
  {
    label: "Create content",
    emoji: "📝",
    tool: "claude",
    idea: "Create a landing page for [your product] — hero headline, 3 benefit sections, social proof, and CTA",
    context: {
      outputFormat:
        "Full page copy with labeled sections and brackets for customization",
    },
  },
];

interface OnboardingPanelProps {
  onSelect: (idea: string, tool: ToolId, context: PromptContext) => void;
}

export function OnboardingPanel({ onSelect }: OnboardingPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked — skip silently
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  function handleSelect(opt: OnboardingOption) {
    track("onboarding_option_selected", { option: opt.label });
    onSelect(opt.idea, opt.tool, opt.context ?? {});
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-clay-200/50 bg-gradient-to-br from-clay-50/60 to-cream-50/60 p-5 mb-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3.5 right-3.5 text-ink-300 hover:text-ink-500 transition-colors"
        aria-label="Dismiss onboarding"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="size-4 text-clay-500 shrink-0" />
        <span className="text-sm font-semibold text-ink-800">
          What are you trying to do?
        </span>
      </div>
      <p className="text-xs text-ink-500 mb-4 leading-relaxed">
        Pick a starting point — it will fill in your idea and select the right
        tool.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleSelect(opt)}
            className="flex items-center gap-2 rounded-xl border border-ink-100/70 bg-white px-3 py-2.5 text-left text-xs font-medium text-ink-700 hover:border-clay-300/60 hover:bg-clay-50/40 hover:text-ink-900 transition-all"
          >
            <span className="text-base leading-none shrink-0">{opt.emoji}</span>
            <span className="leading-snug">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
