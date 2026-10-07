import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingStatus, getOrCreateStripeCustomer, isFounderEligible } from "@/lib/billing";
import { checkoutPrice, checkoutPlan, checkoutReturn } from "@/lib/checkout";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 422 });
  const { offerType, promoCode, returnTo } = body as { offerType?: unknown; promoCode?: unknown; returnTo?: unknown };
  if (offerType !== "monthly" && offerType !== "lifetime") return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 422 });
  if (promoCode !== undefined && typeof promoCode !== "string") return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 422 });
  const normalizedCode = typeof promoCode === "string" ? promoCode.trim().toUpperCase() : undefined;
  const billing = await getBillingStatus(supabase, user.id);
  if (billing.isPaid) return NextResponse.json({ error: "ALREADY_PAID" }, { status: 409 });
  let founder: boolean;
  try { founder = await isFounderEligible(supabase, normalizedCode); }
  catch { return NextResponse.json({ error: "OFFER_CHECK_FAILED" }, { status: 503 }); }
  if (normalizedCode && !founder) return NextResponse.json({ error: "OFFER_UNAVAILABLE", message: "This offer is no longer available. Please review the current prices." }, { status: 409 });
  const plan = checkoutPlan(offerType, founder);
  const priceId = offerType === "monthly"
    ? (founder ? process.env.STRIPE_PRICE_FOUNDER_MONTHLY : process.env.STRIPE_PRICE_PRO_MONTHLY)
    : (founder ? process.env.STRIPE_PRICE_FOUNDER_LIFETIME : process.env.STRIPE_PRICE_LIFETIME);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!priceId || !process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "MISSING_CONFIG" }, { status: 503 });
  }
  try {
    const price = await stripe.prices.retrieve(priceId);
    // Never take a customer to an amount or billing interval different from the displayed offer.
    if (!price.active || price.currency !== "usd" || price.unit_amount !== checkoutPrice(offerType, founder)
      || (offerType === "monthly" ? price.type !== "recurring" || price.recurring?.interval !== "month" || price.recurring?.interval_count !== 1 : price.type !== "one_time")) {
      return NextResponse.json({ error: "PRICE_MISMATCH" }, { status: 503 });
    }
    const customerId = await getOrCreateStripeCustomer(supabase, user.id, user.email ?? "");
    const destination = checkoutReturn(returnTo);
    const cancelParams = new URLSearchParams({ checkout: "cancelled", returnTo: destination });
    if (founder) cancelParams.set("promo", "UMPROMPT");
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: offerType === "monthly" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/plan/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/plan?${cancelParams}`,
      metadata: { user_id: user.id, offer_type: offerType, plan, promo_code: normalizedCode ?? "", is_founder: String(founder), return_to: destination },
      ...(offerType === "monthly" && { subscription_data: { metadata: { user_id: user.id, plan, is_founder: String(founder) } } }),
    });
    if (!session.url) throw new Error("Checkout URL unavailable.");
    if (founder && normalizedCode) {
      const pending = await createAdminClient().from("promo_redemptions").upsert({
        user_id: user.id, code: normalizedCode, offer_type: offerType, stripe_checkout_session_id: session.id, status: "pending",
      }, { onConflict: "stripe_checkout_session_id" });
      if (pending.error) {
        await stripe.checkout.sessions.expire(session.id);
        throw new Error("Could not reserve checkout redemption.");
      }
    }
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[checkout] could not start", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "STRIPE_ERROR" }, { status: 503 });
  }
}
