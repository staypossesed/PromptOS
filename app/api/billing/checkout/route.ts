import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer, isFounderEligible } from "@/lib/billing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Please sign in to upgrade.", authRequired: true },
      { status: 401 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { offerType, promoCode } = body as { offerType?: string; promoCode?: string };

  if (offerType !== "monthly" && offerType !== "lifetime") {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "offerType must be 'monthly' or 'lifetime'" },
      { status: 422 }
    );
  }

  const normalizedCode = typeof promoCode === "string" ? promoCode.trim().toUpperCase() : undefined;
  const promoApplied = Boolean(normalizedCode);

  // ── Resolve price ID ──────────────────────────────────────────────────────
  const founderEligible = await isFounderEligible(supabase, normalizedCode);

  let priceId: string | undefined;
  let plan: string;
  let isFounder = false;

  if (founderEligible) {
    isFounder = true;
    if (offerType === "monthly") {
      priceId = process.env.STRIPE_PRICE_FOUNDER_MONTHLY;
      plan = "founder_monthly";
    } else {
      priceId = process.env.STRIPE_PRICE_FOUNDER_LIFETIME;
      plan = "founder_lifetime";
    }
  } else {
    if (offerType === "monthly") {
      priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
      plan = "pro_monthly";
    } else {
      priceId = process.env.STRIPE_PRICE_LIFETIME;
      plan = "lifetime";
    }
  }

  if (!priceId) {
    console.error("[checkout] missing price env var", {
      offerType,
      promoApplied,
      isFounder,
      plan,
      hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasProMonthly: Boolean(process.env.STRIPE_PRICE_PRO_MONTHLY),
      hasFounderMonthly: Boolean(process.env.STRIPE_PRICE_FOUNDER_MONTHLY),
      hasLifetime: Boolean(process.env.STRIPE_PRICE_LIFETIME),
      hasFounderLifetime: Boolean(process.env.STRIPE_PRICE_FOUNDER_LIFETIME),
      hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    });
    return NextResponse.json(
      { error: "MISSING_CONFIG", message: "Missing Stripe price configuration." },
      { status: 503 }
    );
  }

  // ── Stripe customer ───────────────────────────────────────────────────────
  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer(supabase, user.id, user.email!);
  } catch (err) {
    console.error("[checkout] getOrCreateStripeCustomer failed:", err instanceof Error ? err.message : err, {
      hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    });
    return NextResponse.json(
      { error: "STRIPE_ERROR", message: "Could not create billing account." },
      { status: 500 }
    );
  }

  // ── Create Checkout session ───────────────────────────────────────────────
  const mode = offerType === "monthly" ? "subscription" : "payment";

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/plan/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/plan?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        offer_type: offerType,
        plan,
        promo_code: normalizedCode ?? "",
        is_founder: String(isFounder),
      },
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: { user_id: user.id, plan, is_founder: String(isFounder) },
        },
      }),
    });

    if (!session.url) {
      console.error("[checkout] session created but url is null", { sessionId: session.id, plan });
      return NextResponse.json(
        { error: "STRIPE_ERROR", message: "Checkout session missing URL." },
        { status: 500 }
      );
    }

    // Record pending promo redemption
    if (isFounder && normalizedCode) {
      await supabase.from("promo_redemptions").insert({
        user_id: user.id,
        code: normalizedCode,
        offer_type: offerType,
        stripe_checkout_session_id: session.id,
        status: "pending",
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] stripe.checkout.sessions.create failed", {
      message,
      offerType,
      promoApplied,
      plan,
      hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasProMonthly: Boolean(process.env.STRIPE_PRICE_PRO_MONTHLY),
      hasFounderMonthly: Boolean(process.env.STRIPE_PRICE_FOUNDER_MONTHLY),
      hasLifetime: Boolean(process.env.STRIPE_PRICE_LIFETIME),
      hasFounderLifetime: Boolean(process.env.STRIPE_PRICE_FOUNDER_LIFETIME),
      hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    });
    return NextResponse.json(
      { error: "STRIPE_ERROR", message: "Checkout could not start. Please try again." },
      { status: 500 }
    );
  }
}
