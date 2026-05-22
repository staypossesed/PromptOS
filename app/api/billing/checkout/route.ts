import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import {
  getOrCreateStripeCustomer,
  isFounderEligible,
} from "@/lib/billing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { offerType, promoCode } = body as {
    offerType?: string;
    promoCode?: string;
  };

  if (offerType !== "monthly" && offerType !== "lifetime") {
    return NextResponse.json(
      { error: "offerType must be 'monthly' or 'lifetime'" },
      { status: 422 }
    );
  }

  const normalizedCode = typeof promoCode === "string" ? promoCode.trim().toUpperCase() : undefined;

  // Determine founder eligibility server-side
  const founderEligible = await isFounderEligible(supabase, normalizedCode);

  // Resolve price ID
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
    return NextResponse.json(
      { error: "Price not configured. Contact support." },
      { status: 503 }
    );
  }

  const customerId = await getOrCreateStripeCustomer(
    supabase,
    user.id,
    user.email!
  );

  const mode = offerType === "monthly" ? "subscription" : "payment";

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
        metadata: {
          user_id: user.id,
          plan,
          is_founder: String(isFounder),
        },
      },
    }),
  });

  // Record pending promo redemption if applicable
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
}
