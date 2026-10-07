import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillCheckout, CheckoutVerificationError } from "@/lib/fulfill-checkout";

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

  console.info("[webhook] received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
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
      default:
        console.info("[webhook] unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("[webhook] handler error:", { type: event.type, message: err instanceof Error ? err.message : err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

async function handleCheckoutCompleted(_supabase: AdminClient, session: Stripe.Checkout.Session) {
  try {
    await fulfillCheckout(session.id);
  } catch (error) {
    // Delayed payments get another event when funds settle. Never grant access early.
    if (error instanceof CheckoutVerificationError && ["PAYMENT_PENDING", "PLAN_INACTIVE"].includes(error.code)) return;
    throw error;
  }
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

  const { error } = await supabase
    .from("billing_subscriptions")
    .update({
      status,
      ...(periodEnd && { current_period_end: periodEnd }),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error("Could not update subscription status.");
}

async function handleSubscriptionDeleted(
  supabase: AdminClient,
  sub: Stripe.Subscription
) {
  const { error } = await supabase
    .from("billing_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error("Could not cancel subscription access.");
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

  const { error } = await supabase
    .from("billing_subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId);
  if (error) throw new Error("Could not record failed payment.");
}
