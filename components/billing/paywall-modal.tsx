"use client";

import { useState, useEffect } from "react";
import { X, Zap, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { track } from "@/lib/analytics";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const { t } = useTranslations();
  const [loading, setLoading] = useState<"monthly" | "lifetime" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (open) track("free_limit_reached");
  }, [open]);

  if (!open) return null;

  async function startCheckout(offerType: "monthly" | "lifetime") {
    setLoading(offerType);
    setCheckoutError(null);
    track("upgrade_clicked", { offer_type: offerType, is_founder: true });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerType, promoCode: "UMPROMPT" }),
      });
      const json = await res.json();
      if (process.env.NODE_ENV === "development" && !res.ok) {
        console.error("[paywall checkout] API error:", res.status, json);
      }
      if (json.url) {
        track("checkout_started", { offer_type: offerType, is_founder: true });
        window.location.href = json.url;
      } else {
        setCheckoutError(json.error ?? "Checkout could not start. Please try again.");
        setLoading(null);
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[paywall checkout] fetch error:", err);
      setCheckoutError("Checkout could not start. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-ink-100/70 bg-card shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-ink-400 hover:text-ink-700 hover:bg-cream-100 transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-9 rounded-xl bg-clay-500/10 flex items-center justify-center">
              <Zap className="size-4 text-clay-600" />
            </div>
          </div>
          <h2 className="font-serif text-xl font-semibold text-ink-900 leading-snug mb-2">
            {t("billing.paywallTitle")}
          </h2>
          <p className="text-sm text-ink-500 leading-relaxed">
            {t("billing.paywallSubtitle")}
          </p>
        </div>

        {/* Promo note */}
        <div className="mb-4 rounded-lg bg-clay-500/8 border border-clay-500/20 px-3 py-2 flex items-center gap-2">
          <Crown className="size-3.5 text-clay-600 shrink-0" />
          <span className="text-xs text-clay-700 font-medium">{t("billing.paywallPromoNote")}</span>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-5">
          <button
            onClick={() => startCheckout("monthly")}
            disabled={loading !== null}
            className="w-full flex items-center justify-between rounded-xl border-2 border-clay-500 bg-clay-500/5 hover:bg-clay-500/10 px-4 py-3.5 transition-colors disabled:opacity-60"
          >
            <div className="text-left">
              <div className="text-sm font-semibold text-ink-900">
                {t("billing.founderMonthlyName")}
              </div>
              <div className="text-xs text-ink-500 mt-0.5">
                {t("billing.featureUnlimited")} · {t("billing.featurePacks")}
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-lg font-bold text-clay-600">
                {loading === "monthly" ? "…" : t("billing.founderMonthlyCtaPrice")}
              </div>
              <div className="text-xs text-ink-400 line-through">$9.99/mo</div>
            </div>
          </button>

          <button
            onClick={() => startCheckout("lifetime")}
            disabled={loading !== null}
            className="w-full flex items-center justify-between rounded-xl border border-ink-200 hover:border-clay-500/50 hover:bg-cream-100/60 px-4 py-3.5 transition-colors disabled:opacity-60"
          >
            <div className="text-left">
              <div className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                {t("billing.founderLifetimeName")}
                <span className="text-[10px] bg-clay-500/10 text-clay-700 border border-clay-500/20 rounded-full px-1.5 py-0.5 font-medium uppercase tracking-wider">
                  {t("billing.featureBestValue")}
                </span>
              </div>
              <div className="text-xs text-ink-500 mt-0.5">
                {t("billing.featureLifetime")} · {t("billing.featureUnlimited")}
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-lg font-bold text-ink-900">
                {loading === "lifetime" ? "…" : t("billing.founderLifetimeCtaPrice")}
              </div>
              <div className="text-xs text-ink-400 line-through">$99.99</div>
            </div>
          </button>
        </div>

        {/* Checkout error */}
        {checkoutError && (
          <p className="mb-3 text-xs text-destructive text-center">{checkoutError}</p>
        )}

        {/* Maybe later */}
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-ink-400 hover:text-ink-600 transition-colors"
        >
          <Clock className="size-3.5" />
          {t("billing.paywallMaybeLater")}
        </button>
      </div>
    </div>
  );
}

// Global event-based trigger so any component can open the paywall without prop drilling
export function dispatchPaywallOpen() {
  window.dispatchEvent(new CustomEvent("open_paywall_modal"));
}

export function usePaywallModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handle() { setOpen(true); }
    window.addEventListener("open_paywall_modal", handle);
    return () => window.removeEventListener("open_paywall_modal", handle);
  }, []);

  return { open, onOpen: () => setOpen(true), onClose: () => setOpen(false) };
}
