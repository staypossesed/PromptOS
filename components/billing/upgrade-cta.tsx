"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export type UpgradeCTAVariant = "first_prompt" | "saved_prompt" | "low_remaining";

interface UpgradeCTAProps {
  variant: UpgradeCTAVariant;
  remainingThisWeek?: number;
  /** Render a compact inline version (for sidebar/usage card) */
  compact?: boolean;
  /** Called after user dismisses — optional extra handler for the parent */
  onDismiss?: () => void;
  /** Source page for analytics */
  sourcePage?: string;
}

const STORAGE_KEYS: Record<UpgradeCTAVariant, string> = {
  first_prompt: "umprompt_cta_first_prompt_dismissed",
  saved_prompt: "umprompt_cta_saved_prompt_dismissed",
  low_remaining: "umprompt_cta_low_remaining_dismissed",
};

const DISMISS_DAYS = 7;

function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
}

// ── Copy per variant ────────────────────────────────────────────────────────

function getContent(variant: UpgradeCTAVariant, remaining: number) {
  switch (variant) {
    case "first_prompt":
      return {
        title: "Your first prompt is ready.",
        body: "Founder Pro unlocks unlimited fair-use prompts, Prompt Packs, and advanced workflows.",
        cta: "Claim founder deal",
      };
    case "saved_prompt":
      return {
        title: "You saved a prompt worth reusing.",
        body: "Founder Lifetime is open for the first 100 users — $34.99 with code UMPROMPT.",
        cta: "Get lifetime access",
      };
    case "low_remaining":
      return {
        title: `${remaining} free ${remaining === 1 ? "prompt" : "prompts"} left this week.`,
        body: "Upgrade now and keep building without waiting for reset.",
        cta: "Upgrade",
      };
  }
}

// ── Main component ──────────────────────────────────────────────────────────

export function UpgradeCTA({
  variant,
  remainingThisWeek = 7,
  compact = false,
  onDismiss,
  sourcePage,
}: UpgradeCTAProps) {
  const [visible, setVisible] = useState(false);
  const key = STORAGE_KEYS[variant];
  const content = getContent(variant, remainingThisWeek);
  const planUrl = "/plan?promo=UMPROMPT";

  // Check dismissal on mount (client-only)
  useEffect(() => {
    if (!isDismissed(key)) {
      setVisible(true);
      track("upgrade_cta_shown", {
        cta_variant: variant,
        remaining_this_week: remainingThisWeek,
        source_page: sourcePage,
      });
    }
  }, [key, variant, remainingThisWeek, sourcePage]);

  const handleDismiss = useCallback(() => {
    markDismissed(key);
    setVisible(false);
    track("upgrade_cta_dismissed", {
      cta_variant: variant,
      remaining_this_week: remainingThisWeek,
      source_page: sourcePage,
    });
    onDismiss?.();
  }, [key, variant, remainingThisWeek, sourcePage, onDismiss]);

  const handleClick = useCallback(() => {
    track("upgrade_cta_clicked", {
      cta_variant: variant,
      remaining_this_week: remainingThisWeek,
      source_page: sourcePage,
    });
  }, [variant, remainingThisWeek, sourcePage]);

  if (!visible) return null;

  // ── Compact variant (sidebar) ────────────────────────────────────────────
  if (compact) {
    return (
      <div className="mt-2 rounded-lg border border-clay-200/60 bg-clay-500/5 px-3 py-2.5">
        <p className="text-[11px] font-medium text-clay-800 mb-1.5">{content.title}</p>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="h-7 text-xs px-3 flex-1"
            onClick={handleClick}
          >
            <Link href={planUrl}>{content.cta}</Link>
          </Button>
          <button
            onClick={handleDismiss}
            className="text-ink-300 hover:text-ink-500 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Full variant ─────────────────────────────────────────────────────────
  return (
    <div className="relative rounded-2xl border border-clay-500/25 bg-clay-500/5 p-5">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 rounded-lg p-1 text-ink-300 hover:text-ink-600 hover:bg-cream-100 transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>

      {/* Founder badge */}
      <div className="flex items-center gap-1.5 mb-3">
        <Crown className="size-3.5 text-clay-600" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay-600">
          Founder offer
        </span>
      </div>

      <h3 className="font-serif text-base font-semibold text-ink-900 mb-1.5 pr-6">
        {content.title}
      </h3>
      <p className="text-[13px] text-ink-500 leading-relaxed mb-4">{content.body}</p>

      <div className="flex items-center gap-3">
        <Button asChild size="sm" onClick={handleClick}>
          <Link href={planUrl}>{content.cta}</Link>
        </Button>
        <button
          onClick={handleDismiss}
          className="text-sm text-ink-400 hover:text-ink-600 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
