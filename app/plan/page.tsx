"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/system/button";
import { usePromptUsage } from "@/hooks/usePromptUsage";
import { track } from "@/lib/analytics";
import { checkoutPrice, checkoutReturn } from "@/lib/checkout";
import { PageViewTracker } from "@/components/system/page-view-tracker";
import { Footer } from "@/components/system/footer";

const FOUNDER_LIMIT = 100;

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function PlanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("checkout") === "cancelled";
  const returnTo = checkoutReturn(searchParams.get("returnTo"));
  const { isPaid, isLoading: usageLoading } = usePromptUsage();
  const checkoutLock = useRef(false);

  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoAutoApplied, setPromoAutoApplied] = useState(false);
  const [promoError, setPromoError] = useState(false);
  const [founderCount, setFounderCount] = useState<number | null>(null);
  const [founderLoading, setFounderLoading] = useState(true);
  const [loading, setLoading] = useState<"monthly" | "lifetime" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const autoAppliedRef = useRef(false);

  useEffect(() => {
    track("plan_page_viewed");
    if (cancelled) track("checkout_cancelled");
    fetch("/api/billing/founder-count")
      .then((response) => response.json())
      .then((data) => { if (typeof data?.count === "number") setFounderCount(data.count); })
      .catch(() => null)
      .finally(() => setFounderLoading(false));
  }, [cancelled]);

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

  const spotsLeft = founderCount !== null ? Math.max(0, FOUNDER_LIMIT - founderCount) : null;
  const founderAvailable = founderCount !== null && founderCount < FOUNDER_LIMIT;
  const founderPrice = promoApplied && founderAvailable;
  const isAnyLoading = loading !== null || usageLoading || isPaid || (promoApplied && founderLoading);

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
    if (checkoutLock.current || usageLoading || isPaid || (promoApplied && founderLoading)) return;
    checkoutLock.current = true;
    let redirecting = false;
    setLoading(offerType);
    setCheckoutError(null);
    track("upgrade_clicked", { offer_type: offerType, is_founder: founderPrice });
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerType,
          promoCode: founderPrice ? "UMPROMPT" : undefined,
          returnTo,
        }),
      });
      const json = await response.json();
      if (response.ok && typeof json.url === "string" && new URL(json.url).origin === "https://checkout.stripe.com") {
        redirecting = true;
        track("checkout_started", { offer_type: offerType, is_founder: founderPrice });
        window.location.href = json.url;
        return;
      }

      const code = json.error as string | undefined;
      if (code === "AUTH_REQUIRED") {
        const next = `/plan?${new URLSearchParams({ returnTo, ...(promoApplied ? { promo: "UMPROMPT" } : {}) })}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      track("checkout_failed", { reason: code ?? "UNKNOWN", offer_type: offerType });
      if (code === "MISSING_CONFIG") {
        setCheckoutError("Payments are temporarily unavailable. Your prompt is safe; you can return to it below.");
      } else if (code === "OFFER_UNAVAILABLE") {
        setPromoApplied(false);
        setPromoAutoApplied(false);
        setFounderCount(FOUNDER_LIMIT);
        setCheckoutError("The founder offer has ended. Please review the regular prices before continuing.");
      } else if (code === "ALREADY_PAID") {
        router.push("/account");
      } else if (code === "PRICE_MISMATCH") {
        setCheckoutError("This price is being updated. Checkout is paused so you are not charged an unexpected amount.");
      } else if (code === "OFFER_CHECK_FAILED") {
        setCheckoutError("We could not confirm this offer. Please retry; no checkout has started.");
      } else if (code === "STRIPE_ERROR") {
        setCheckoutError("Stripe checkout could not start. Please try again.");
      } else {
        setCheckoutError(json.message ?? "Checkout could not start. Please try again.");
      }
    } catch {
      setCheckoutError("Checkout could not start. Please try again.");
      track("checkout_failed", { reason: "NETWORK", offer_type: offerType });
    } finally {
      if (!redirecting) {
        checkoutLock.current = false;
        setLoading(null);
      }
    }
  }

  return (
    <>
    <div className="wrap" style={{ paddingBlock: "clamp(32px, 5vw, 72px)" }}>
      <PageViewTracker event="plan_page_viewed" />
      <header className="app-head">
        <div className="stack">
          <h1 className="app-head__title">Plans.</h1>
          <p className="app-head__sub">
            Start free. Pay when the workspace earns it. Monthly or once, with a founder price
            for the first 100.
          </p>
        </div>
      </header>

      {promoAutoApplied && founderAvailable ? (
        <p className="small" style={{ marginBottom: 24 }}>
          Founder prices unlocked. {spotsLeft} spots left.
        </p>
      ) : null}

      {founderAvailable ? (
        <section className="sheet sheet--surface" style={{ marginBottom: 32 }}>
          <div className="stack">
            <p className="body">
              Founder price: {dollars(checkoutPrice("monthly", true))} a month or{" "}
              {dollars(checkoutPrice("lifetime", true))} once. {spotsLeft} spots left.
            </p>
            <div className="composer__actions">
              <label className="sr-only" htmlFor="promo">Promo code</label>
              <input
                id="promo"
                className="field__input"
                style={{ maxWidth: 220 }}
                value={promoInput}
                onChange={(event) => { setPromoInput(event.target.value); setPromoError(false); }}
                onKeyDown={(event) => { if (event.key === "Enter") applyPromo(); }}
                placeholder="UMPROMPT"
              />
              <Button size="sm" variant="ghost" onClick={applyPromo}>Apply code</Button>
              {promoApplied ? <span className="small">Code applied.</span> : null}
              {promoError ? <span className="field__error">That code is not valid.</span> : null}
            </div>
          </div>
        </section>
      ) : null}

      {cancelled ? <p className="small" style={{ marginBottom: 20 }}>Checkout was cancelled. Your plan has not changed.</p> : null}
      {isPaid ? <p className="small" style={{ marginBottom: 20 }}>You already have a paid plan. <Link href="/account" className="link-arrow">Manage billing</Link></p> : null}

      <div className="grid-3">
        <section className="plan-card">
          <h2 className="plan-card__price">$0</h2>
          <p className="body">Seven prompts a week. The full composer, the score, and your saved history. No card.</p>
          <ul className="plan-card__list">
            <li>7 prompts a week</li>
            <li>Single prompt builder</li>
            <li>Saved prompts and history</li>
            <li>Templates</li>
          </ul>
          <Link href={returnTo} className="button button--ghost button--small">Back to the workspace</Link>
        </section>

        <section className="plan-card plan-card--accent">
          <div>
            <h2 className="plan-card__price">{dollars(checkoutPrice("monthly", founderPrice))}</h2>
            <p className="small">{founderPrice ? "Founder monthly" : "Pro monthly"} · per month{founderPrice ? ` · normally ${dollars(checkoutPrice("monthly", false))}` : ""}</p>
          </div>
          <p className="body">Unlimited fair use. Prompt packs, profiles, playbooks, and the full workspace. Cancel future renewals anytime.</p>
          <ul className="plan-card__list">
            <li>Unlimited fair use</li>
            <li>Prompt packs</li>
            <li>Library profiles and playbooks</li>
            <li>Full history</li>
          </ul>
          <Button
            variant="ink"
            onClick={() => startCheckout("monthly")}
            disabled={isAnyLoading}
          >
            {loading === "monthly" ? "Opening checkout" : "Choose monthly"}
          </Button>
        </section>

        <section className="plan-card">
          <div>
            <h2 className="plan-card__price">{dollars(checkoutPrice("lifetime", founderPrice))}</h2>
            <p className="small">{founderPrice ? "Founder lifetime" : "Lifetime"} · once{founderPrice ? ` · normally ${dollars(checkoutPrice("lifetime", false))}` : ""}</p>
          </div>
          <p className="body">One payment. No recurring subscription. The same Pro workspace.</p>
          <ul className="plan-card__list">
            <li>Unlimited fair use</li>
            <li>Prompt packs</li>
            <li>Library profiles and playbooks</li>
            <li>Full history</li>
          </ul>
          <Button
            variant="ghost"
            onClick={() => startCheckout("lifetime")}
            disabled={isAnyLoading}
          >
            {loading === "lifetime" ? "Opening checkout" : "Choose lifetime"}
          </Button>
        </section>
      </div>

      {checkoutError ? <p className="field__error" role="alert" style={{ marginTop: 24 }}>{checkoutError}</p> : null}

      <p style={{ marginTop: 32 }}>
        <Link href={returnTo} className="link-arrow">Back to the workspace</Link>
      </p>

      <p className="small" style={{ marginTop: 16, maxWidth: "60ch", color: "var(--ink)" }}>
        Payments are handled by Stripe. Cancel anytime for monthly plans. No refunds on
        lifetime purchases.
      </p>
    </div>
    <Footer strip />
    </>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingBlock: 64 }}><p className="body">Loading the plans.</p></div>}>
      <PlanInner />
    </Suspense>
  );
}
