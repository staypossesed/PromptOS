"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Crown, Zap, Infinity, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { track } from "@/lib/analytics";

const FOUNDER_LIMIT = 100;

export default function PlanPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("checkout") === "cancelled";

  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoAutoApplied, setPromoAutoApplied] = useState(false);
  const [promoError, setPromoError] = useState(false);
  const [founderCount, setFounderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<"monthly" | "lifetime" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const autoAppliedRef = useRef(false);

  useEffect(() => {
    track("plan_page_viewed");
    fetch("/api/billing/founder-count")
      .then((r) => r.json())
      .then((data) => { if (typeof data?.count === "number") setFounderCount(data.count); })
      .catch(() => null);
  }, []);

  // Auto-apply promo code from URL (?promo=UMPROMPT)
  useEffect(() => {
    const promo = searchParams.get("promo");
    if (promo?.toUpperCase() === "UMPROMPT" && !autoAppliedRef.current) {
      autoAppliedRef.current = true;
      setPromoInput("UMPROMPT");
      setPromoApplied(true);
      setPromoAutoApplied(true);
      track("promo_code_applied", { is_founder: true, source: "url_param" });
    }
  }, [searchParams]);

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (code === "UMPROMPT") {
      setPromoApplied(true);
      setPromoError(false);
      track("promo_code_applied", { is_founder: true });
    } else {
      setPromoError(true);
      setPromoApplied(false);
    }
  }

  async function startCheckout(offerType: "monthly" | "lifetime") {
    setLoading(offerType);
    setCheckoutError(null);
    track("upgrade_clicked", { offer_type: offerType, is_founder: promoApplied });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerType,
          promoCode: promoApplied ? "UMPROMPT" : undefined,
        }),
      });
      const json = await res.json();
      if (process.env.NODE_ENV === "development") {
        console.log("[checkout] response", res.status, json);
      }

      if (json.url) {
        track("checkout_started", { offer_type: offerType, is_founder: promoApplied });
        window.location.href = json.url;
        return;
      }

      // Handle structured error codes
      const code = json.error as string | undefined;
      if (code === "AUTH_REQUIRED") {
        router.push("/login?next=/plan");
        return;
      }
      if (code === "MISSING_CONFIG") {
        setCheckoutError("Checkout is not configured yet. Please contact support.");
      } else if (code === "STRIPE_ERROR") {
        setCheckoutError("Stripe checkout could not start. Please try again.");
      } else {
        setCheckoutError(json.message ?? "Checkout could not start. Please try again.");
      }
      setLoading(null);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[checkout] fetch error:", err);
      setCheckoutError("Checkout could not start. Please try again.");
      setLoading(null);
    }
  }

  const spotsLeft = founderCount !== null ? Math.max(0, FOUNDER_LIMIT - founderCount) : null;
  const isAnyLoading = loading !== null;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 transition-colors mb-8"
        >
          <ArrowLeft className="size-3.5" />
          Back to workspace
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink-900 mb-3">
            {t("billing.planTitle")}
          </h1>
          <p className="text-ink-500 text-[15px]">{t("billing.planSubtitle")}</p>
        </div>

        {/* Auto-applied founder unlock notice */}
        {promoAutoApplied && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-clay-500/30 bg-clay-500/8 px-4 py-3 text-sm text-clay-800">
            <Crown className="size-4 shrink-0 text-clay-600" />
            <span className="font-medium">Founder prices unlocked.</span>
            <span className="text-clay-600">You&apos;re seeing the founder rate — $4.99/mo or $34.99 lifetime.</span>
          </div>
        )}

        {/* Cancelled notice */}
        {cancelled && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-ink-100 bg-cream-100/60 px-4 py-3 text-sm text-ink-600">
            <AlertCircle className="size-4 shrink-0 text-ink-400" />
            Checkout was cancelled. No charges were made.
          </div>
        )}

        {/* Founder banner */}
        <div className="mb-8 rounded-2xl border border-clay-500/30 bg-clay-500/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-xl bg-clay-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Crown className="size-4 text-clay-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-clay-800 mb-1">
                {t("billing.founderBanner")}
              </p>
              <p className="text-xs text-clay-600">
                {t("billing.featureFirstHundred")}
                {spotsLeft !== null && ` — ${spotsLeft} ${t("billing.founderSpotsLeft")}`}
              </p>
            </div>
          </div>

          {/* Promo code input */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value); setPromoError(false); }}
              onKeyDown={(e) => e.key === "Enter" && applyPromo()}
              placeholder={t("billing.promoCodePlaceholder")}
              className="flex-1 h-9 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-clay-500/30 focus:border-clay-500"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={applyPromo}
              className="shrink-0 border-clay-500/40 text-clay-700 hover:bg-clay-500/10"
            >
              {t("billing.applyCode")}
            </Button>
          </div>
          {promoApplied && (
            <p className="mt-2 text-xs text-green-700 flex items-center gap-1">
              <Check className="size-3.5" />
              {t("billing.codeApplied")}
            </p>
          )}
          {promoError && (
            <p className="mt-2 text-xs text-destructive">{t("billing.codeInvalid")}</p>
          )}
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Free */}
          <PricingCard
            name={t("billing.freePlanName")}
            price="$0"
            period=""
            description="Get started with the basics."
            features={[
              t("billing.featureFreePrompts"),
              t("billing.featureBuilder"),
              t("billing.featureTemplates"),
            ]}
            cta={t("billing.getStartedFree")}
            ctaHref="/dashboard"
            variant="neutral"
          />

          {/* Monthly */}
          <PricingCard
            name={promoApplied ? t("billing.founderMonthlyName") : t("billing.proMonthlyName")}
            price={promoApplied ? "$4.99" : "$9.99"}
            period="/mo"
            originalPrice={promoApplied ? "$9.99/mo" : undefined}
            description={promoApplied ? t("billing.featureFirstHundred") : "Full access, monthly billing."}
            features={[
              t("billing.featureUnlimited"),
              t("billing.featurePacks"),
              t("billing.featureHistory"),
              t("billing.featureTemplates"),
            ]}
            cta={t("billing.upgradeMonthly")}
            onCta={() => startCheckout("monthly")}
            loading={loading === "monthly"}
            disabled={isAnyLoading}
            variant="primary"
            founderBadge={promoApplied}
          />

          {/* Lifetime */}
          <PricingCard
            name={promoApplied ? t("billing.founderLifetimeName") : t("billing.lifetimeName")}
            price={promoApplied ? "$34.99" : "$99.99"}
            period=""
            originalPrice={promoApplied ? "$99.99" : undefined}
            description={promoApplied ? t("billing.featureFirstHundred") : "Pay once, use forever."}
            features={[
              t("billing.featureUnlimited"),
              t("billing.featureLifetime"),
              t("billing.featurePacks"),
              t("billing.featureHistory"),
            ]}
            cta={t("billing.upgradeLifetime")}
            onCta={() => startCheckout("lifetime")}
            loading={loading === "lifetime"}
            disabled={isAnyLoading}
            variant="accent"
            bestValueBadge
            founderBadge={promoApplied}
          />
        </div>

        {/* Checkout error */}
        {checkoutError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {checkoutError}
          </div>
        )}

        {/* Fine print */}
        <p className="text-center text-xs text-ink-400">
          Payments secured by Stripe. Cancel anytime for monthly plans. No refunds on lifetime purchases.
        </p>
      </div>
    </div>
  );
}

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  originalPrice?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  onCta?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant: "neutral" | "primary" | "accent";
  bestValueBadge?: boolean;
  founderBadge?: boolean;
}

function PricingCard({
  name,
  price,
  period,
  originalPrice,
  description,
  features,
  cta,
  ctaHref,
  onCta,
  loading,
  disabled,
  variant,
  bestValueBadge,
  founderBadge,
}: PricingCardProps) {
  const isPrimary = variant === "primary";
  const isAccent = variant === "accent";

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col ${
        isPrimary
          ? "border-clay-500/40 bg-clay-500/5 ring-1 ring-clay-500/20"
          : isAccent
          ? "border-ink-900/20 bg-ink-900/[0.03]"
          : "border-ink-100/70 bg-card card-soft"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-ink-800">{name}</h3>
            {founderBadge && (
              <span className="text-[10px] uppercase tracking-wider text-clay-700 bg-clay-500/10 border border-clay-500/20 rounded-full px-1.5 py-0.5 font-medium flex items-center gap-0.5">
                <Crown className="size-2.5" /> Founder
              </span>
            )}
            {bestValueBadge && !founderBadge && (
              <span className="text-[10px] uppercase tracking-wider text-ink-700 bg-ink-900/8 border border-ink-900/15 rounded-full px-1.5 py-0.5 font-medium">
                Best value
              </span>
            )}
          </div>
          <p className="text-xs text-ink-500">{description}</p>
        </div>
        {isAccent && <Infinity className="size-4 text-ink-400 shrink-0" />}
        {isPrimary && <Zap className="size-4 text-clay-500 shrink-0" />}
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-ink-900">{price}</span>
          {period && <span className="text-sm text-ink-400">{period}</span>}
        </div>
        {originalPrice && (
          <div className="text-xs text-ink-400 line-through mt-0.5">{originalPrice}</div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-ink-600">
            <Check className="size-3.5 text-green-600 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {ctaHref ? (
        <Button asChild variant={isPrimary ? "default" : "outline"} className="w-full">
          <Link href={ctaHref}>{cta}</Link>
        </Button>
      ) : (
        <Button
          variant={isPrimary || isAccent ? "default" : "outline"}
          className="w-full"
          onClick={onCta}
          disabled={disabled || loading}
        >
          {loading ? "Redirecting…" : cta}
        </Button>
      )}
    </div>
  );
}
