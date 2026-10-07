import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutPlanMatches } from "@/lib/checkout";

export class CheckoutVerificationError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

// Retrieve current Stripe state so replaying an old session cannot revive a cancelled plan.
export async function fulfillCheckout(sessionId: string, expectedUser?: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription", "line_items.data.price"] });
  const userId = session.metadata?.user_id;
  if (!userId || (expectedUser && userId !== expectedUser)) throw new CheckoutVerificationError("FORBIDDEN", 403);
  if (session.status !== "complete" || session.payment_status !== "paid") throw new CheckoutVerificationError("PAYMENT_PENDING", 409);
  const plan = session.metadata?.plan;
  if (!checkoutPlanMatches(plan, session.mode)) throw new CheckoutVerificationError("INVALID_PLAN", 422);
  let subscription: Stripe.Subscription | null = null;
  if (session.mode === "subscription") {
    subscription = typeof session.subscription === "string" ? await stripe.subscriptions.retrieve(session.subscription) : session.subscription;
    if (!subscription || !["active", "trialing"].includes(subscription.status)) throw new CheckoutVerificationError("PLAN_INACTIVE", 409);
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const periodEnd = subscription?.items.data[0]?.current_period_end;
  const isFounder = plan === "founder_monthly" || plan === "founder_lifetime";
  const admin = createAdminClient();
  const result = await admin.from("billing_subscriptions").upsert({
    user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: subscription?.id ?? null,
    stripe_checkout_session_id: session.id, stripe_price_id: session.line_items?.data[0]?.price?.id ?? null,
    plan, status: subscription?.status ?? "active", is_lifetime: session.mode === "payment", is_founder: isFounder,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null, updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_checkout_session_id" });
  if (result.error) throw new Error("Billing activation could not be saved.");
  if (customerId) {
    const mapping = await admin.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (mapping.error) throw new Error("Billing customer could not be saved.");
  }
  if (isFounder && session.metadata?.promo_code) {
    const redemption = await admin.from("promo_redemptions").upsert({ user_id: userId, code: session.metadata.promo_code, offer_type: session.mode === "subscription" ? "monthly" : "lifetime", stripe_checkout_session_id: session.id, status: "succeeded", updated_at: new Date().toISOString() }, { onConflict: "stripe_checkout_session_id" });
    if (redemption.error) throw new Error("Founder redemption could not be saved.");
  }
  return { plan, isFounder, returnTo: session.metadata?.return_to };
}
