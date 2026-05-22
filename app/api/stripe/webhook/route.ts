import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[webhook] signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }
    }
  } catch (err) {
    console.error("[webhook] handler error:", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

async function handleCheckoutCompleted(
  supabase: AdminClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  const isFounder = session.metadata?.is_founder === "true";
  const promoCode = session.metadata?.promo_code;

  if (!userId || !plan) {
    console.error("[webhook] checkout.session.completed: missing metadata", session.id);
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (session.mode === "subscription") {
    const stripeSubId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    // Fetch subscription details to get period_end (on items in API v2026+)
    let periodEnd: string | null = null;
    if (stripeSubId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const itemPeriodEnd = stripeSub.items?.data?.[0]?.current_period_end;
        if (itemPeriodEnd) periodEnd = new Date(itemPeriodEnd * 1000).toISOString();
      } catch {}
    }

    await supabase.from("billing_subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: stripeSubId,
        stripe_checkout_session_id: session.id,
        stripe_price_id: session.metadata?.plan ?? null,
        plan,
        status: "active",
        is_lifetime: false,
        is_founder: isFounder,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" }
    );
  } else if (session.mode === "payment") {
    // One-time lifetime purchase
    await supabase.from("billing_subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: null,
        stripe_checkout_session_id: session.id,
        stripe_price_id: session.metadata?.plan ?? null,
        plan,
        status: "active",
        is_lifetime: true,
        is_founder: isFounder,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" }
    );
  }

  // Upsert customer mapping
  if (customerId) {
    await supabase.from("billing_customers").upsert(
      { user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }

  // Mark promo redemption succeeded
  if (isFounder && promoCode && session.id) {
    await supabase
      .from("promo_redemptions")
      .update({ status: "succeeded", updated_at: new Date().toISOString() })
      .eq("stripe_checkout_session_id", session.id);
  }

  console.info("[webhook] checkout.session.completed fulfilled:", {
    userId,
    plan,
    isFounder,
    sessionId: session.id,
  });
}

async function handleSubscriptionUpdated(
  supabase: AdminClient,
  sub: Stripe.Subscription
) {
  const userId = sub.metadata?.user_id;
  if (!userId) return;

  const status = sub.status === "active" || sub.status === "trialing" ? sub.status : "inactive";
  // In API v2026+, period end is on subscription items
  const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end;
  const periodEnd = itemPeriodEnd ? new Date(itemPeriodEnd * 1000).toISOString() : null;

  await supabase
    .from("billing_subscriptions")
    .update({
      status,
      ...(periodEnd && { current_period_end: periodEnd }),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
}

async function handleSubscriptionDeleted(
  supabase: AdminClient,
  sub: Stripe.Subscription
) {
  await supabase
    .from("billing_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id);
}

async function handlePaymentFailed(
  supabase: AdminClient,
  invoice: Stripe.Invoice
) {
  // In API v2026+, subscription is nested in invoice.parent.subscription_details
  const subDetails = invoice.parent?.type === "subscription_details"
    ? invoice.parent.subscription_details
    : null;
  const subRef = subDetails?.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;

  if (!subId) return;

  await supabase
    .from("billing_subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId);
}
